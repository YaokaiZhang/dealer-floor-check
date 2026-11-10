/**
 * The risk model. In the demo it is a transparent weighted score: every point has a reason the bank
 * officer can read. After a pilot, a trained model would replace the weights but keep the same inputs
 * and the same "top reasons" view. Nothing here decides anything; it ranks and recommends.
 */
import type { Car, DemoState, Dealer, SamplingExplanation } from "./types";
import { physicalPlan, TIERS } from "@/config/tiers";
import { detectionProbability, expectedDaysToDetect, missingToDetect, sampleSize, yearlyDetection } from "./sampling";

const DAY = 86_400_000;
/** A car confirmed on the lot within this many days counts as collateral confirmed. */
export const CONFIRMED_DAYS = 90;
/** Stock older than this counts as old stock. */
export const OLD_STOCK_DAYS = 90;

/** Score from which a dealer reads "act now" on the bank dashboard. */
const ACT_NOW = 60;

const daysSince =(iso: string | undefined, now: number) => (iso ? Math.max(0, (now - Date.parse(iso)) / DAY) : Infinity);
const isOpenAlert = (status: string) => status === "open" || status === "investigating";

/** Cars grouped by dealer, cached per cars array (the state is replaced, never mutated, on the client). */
const byDealerCache = new WeakMap<Car[], Map<string, Car[]>>();
export function carsOf(state: DemoState, dealerId: string): Car[] {
  let m = byDealerCache.get(state.cars);
  if (!m) {
    m = new Map();
    for (const c of state.cars) (m.get(c.dealerId) ?? m.set(c.dealerId, []).get(c.dealerId)!).push(c);
    byDealerCache.set(state.cars, m);
  }
  return m.get(dealerId) ?? [];
}

export const financedCars = (state: DemoState, dealerId: string) =>
  carsOf(state, dealerId).filter((c) => c.status !== "sold_paid" && c.status !== "paid_off");

export const isConfirmed = (car: Car, now = Date.now()) => car.status === "in_stock" && daysSince(car.lastCheckedAt, now) <= CONFIRMED_DAYS;

export function portfolioStats(state: DemoState, dealerId: string, now = Date.now()) {
  const cars = financedCars(state, dealerId);
  const inStock = cars.filter((c) => c.status === "in_stock");
  const financedTotal = cars.reduce((s, c) => s + c.loanAmount, 0);
  const confirmed = inStock.filter((c) => isConfirmed(c, now));
  const confirmedValue = confirmed.reduce((s, c) => s + c.loanAmount, 0);
  const oldStock = inStock.filter((c) => daysSince(c.loanOpenedAt, now) > OLD_STOCK_DAYS);
  const openAlerts = state.alerts.filter((a) => a.dealerId === dealerId && isOpenAlert(a.status));
  return {
    cars,
    pool: inStock,
    financedTotal,
    confirmed,
    confirmedValue,
    confirmedShare: financedTotal ? confirmedValue / financedTotal : 0,
    oldStockShare: inStock.length ? oldStock.length / inStock.length : 0,
    openAlerts,
  };
}

// ---------------------------------------------------------------- car ranking

/**
 * Risk weight of one car: decides how likely it is to be drawn for a self-check or spot check.
 * Every car keeps a base weight of 1, so the draw stays partly random and no car is ever safe.
 */
export function carRisk(state: DemoState, car: Car, now = Date.now()): { weight: number; reasons: string[] } {
  const reasons: string[] = [];
  let w = 1;
  const age = daysSince(car.loanOpenedAt, now);
  if (age > OLD_STOCK_DAYS) { w += Math.min(2, age / 90 - 0.5); reasons.push(`${Math.round(age)} days in stock`); }
  if (car.loanAmount >= 35000) { w += car.loanAmount / 40000; reasons.push("High loan value"); }
  const unchecked = daysSince(car.lastCheckedAt, now);
  if (unchecked === Infinity) { w += 1; reasons.push("Never checked"); }
  else if (unchecked > 120) { w += Math.min(1.5, unchecked / 120 - 0.5); reasons.push(`Not checked for ${Math.round(unchecked)} days`); }
  const m = state.feeds.marketplace[car.vin];
  if (m?.listed && m.status === "active") { w += 0.5; reasons.push("Listed for sale"); }
  if (state.alerts.some((a) => a.vin === car.vin && isOpenAlert(a.status))) { w += 3; reasons.push("Flagged by a check"); }
  return { weight: +w.toFixed(2), reasons };
}

/** Weighted draw without replacement (Efraimidis–Spirakis): higher weight, more likely, never certain. */
export function weightedDraw<T>(items: T[], weight: (t: T) => number, k: number): T[] {
  const r = () => (typeof crypto !== "undefined" ? crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 : Math.random()) || 1e-9;
  return items
    .map((t) => ({ t, key: r() ** (1 / Math.max(0.01, weight(t))) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, k)
    .map((x) => x.t);
}

// ---------------------------------------------------------------- sampling

export function samplingFor(state: DemoState, dealer: Dealer) {
  const { cars, pool } = portfolioStats(state, dealer.id);
  const tier = TIERS[dealer.tier];
  const { p, confidence, maxCars } = tier.sampling;
  const perYear = tier.checkInsPerYear;

  // Spot checks draw from the same in-stock cars.
  const stock = pool.length;
  const plan = physicalPlan(dealer.tier, stock);
  const visitCars = Math.min(plan.carsPerVisit, stock);
  const visitsPerYear = plan.visits;
  const perVisit = stock ? detectionProbability(stock, missingToDetect(stock, p), visitCars) : 0;
  const visitMiss = (1 - perVisit) ** visitsPerYear;

  const n = sampleSize(pool.length, p, confidence, perYear, maxCars, visitMiss);
  const M = missingToDetect(pool.length, p);
  const perCheckIn = pool.length ? detectionProbability(pool.length, M, n) : 0;
  const yearly = 1 - (pool.length ? 1 - yearlyDetection(pool.length, M, n, perYear) : 1) * visitMiss;
  // Mean wait: events every 365/(k+v) days, each catching it with the average chance per event.
  const events = perYear + visitsPerYear;
  const avgCatch = (perYear * perCheckIn + visitsPerYear * perVisit) / events;
  const explanation: SamplingExplanation = {
    fleet: cars.length, pool: pool.length, n, p, confidence, missingToDetect: M,
    perYear, maxCars, perCheckIn, yearly,
    visitsPerYear, visitCars, perVisit,
    expectedDays: Math.round(expectedDaysToDetect(avgCatch, events)),
  };
  return { explanation, pool };
}

// ---------------------------------------------------------------- dealer ranking

/**
 * Dealer risk score, 0 (no concern) – 100 (act now). Each part is a reason the officer can read:
 *   base                                   15
 *   + open alerts                          high +35, medium +15, low +5 (each)
 *   + last 6 check-ins                     failed +12, skipped +8, clean −3 (each)
 *   + reschedules in the last 6 requests   +4 each
 *   + late payoffs and past alerts         +6 each
 *   + photos that needed a look (recent)   +3 each, up to +9
 *   + old stock (over 90 days)             up to +15 by share of stock
 * Clamped to 0–100.
 */
export function riskScore(state: DemoState, dealer: Dealer, now = Date.now()): { score: number; parts: { label: string; points: number }[]; top: string[] } {
  const parts: { label: string; points: number }[] = [{ label: "Base", points: 15 }];
  const { openAlerts, oldStockShare } = portfolioStats(state, dealer.id, now);
  const sev = { high: 35, medium: 15, low: 5 } as const;
  const alertPts = openAlerts.reduce((s, a) => s + sev[a.severity], 0);
  if (alertPts) parts.push({ label: `${openAlerts.length} open alert${openAlerts.length > 1 ? "s" : ""}`, points: alertPts });

  const recent = dealer.history.filter((h) => h.kind === "check_in").slice(-6);
  const failed = recent.filter((h) => h.outcome === "failed").length;
  const skipped = recent.filter((h) => h.outcome === "skipped").length;
  const clean = recent.filter((h) => h.outcome === "clean").length;
  if (failed) parts.push({ label: `${failed} failed check-in${failed > 1 ? "s" : ""}`, points: failed * 12 });
  if (skipped) parts.push({ label: `${skipped} skipped check-in${skipped > 1 ? "s" : ""}`, points: skipped * 8 });
  if (clean) parts.push({ label: `${clean} clean check-in${clean > 1 ? "s" : ""}`, points: -clean * 3 });

  const requests = state.checkIns.filter((c) => c.dealerId === dealer.id).slice(0, 6);
  const resched = requests.filter((c) => c.rescheduled).length;
  if (resched) parts.push({ label: `${resched} reschedule${resched > 1 ? "s" : ""}`, points: resched * 4 });

  const late = dealer.history.filter((h) => h.kind === "payoff" && h.outcome === "info").length;
  if (late) parts.push({ label: `${late} late payoff${late > 1 ? "s" : ""}`, points: late * 6 });
  const past = dealer.history.filter((h) => h.kind === "alert" && h.outcome === "resolved").length;
  if (past) parts.push({ label: `${past} past alert${past > 1 ? "s" : ""}`, points: past * 6 });

  const looks = requests.reduce((n, c) => n + Object.values(c.results).filter((r) => !("skipped" in r) && r.needsLook?.length).length, 0);
  if (looks) parts.push({ label: `${looks} photo${looks > 1 ? "s" : ""} needed a look`, points: Math.min(9, looks * 3) });

  const oldPts = Math.round(oldStockShare * 15);
  if (oldPts) parts.push({ label: `${Math.round(oldStockShare * 100)}% stock over ${OLD_STOCK_DAYS} days`, points: oldPts });

  // An open high alert always lands the dealer in "act now", whatever the rest of the record says.
  const sum = parts.reduce((s, p) => s + p.points, 0);
  if (openAlerts.some((a) => a.severity === "high") && sum < ACT_NOW) parts.push({ label: "Open high alert: act now", points: ACT_NOW - sum });
  const score = Math.max(0, Math.min(100, parts.reduce((s, p) => s + p.points, 0)));
  const top = parts.filter((p) => p.label !== "Base" && p.points > 0).sort((a, b) => b.points - a.points).slice(0, 3).map((p) => `${p.label}, +${p.points}`);
  return { score, parts, top };
}
