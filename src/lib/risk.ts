import type { Car, DemoState, Dealer, SamplingExplanation } from "./types";
import { distanceM } from "./geo";
import { TIERS } from "@/config/tiers";
import { detectionProbability, expectedDaysToDetect, missingToDetect, sampleSize, yearlyDetection } from "./sampling";

const HOUR = 3600_000;

/** A connected car seen inside the geofence in the last 24 h with no open alert is verified with zero human effort. */
export function isAutoVerified(state: DemoState, car: Car, now = Date.now()): boolean {
  if (!car.connected || car.status !== "in_stock") return false;
  const f = state.feeds.connected[car.vin];
  if (!f) return false;
  const dealer = state.dealers.find((d) => d.id === car.dealerId)!;
  const fresh = now - new Date(f.lastSeen).getTime() < 24 * HOUR;
  const inside = distanceM(f, dealer.geofence) <= dealer.geofence.radiusM;
  const alerted = state.alerts.some((a) => a.vin === car.vin && (a.status === "open" || a.status === "investigating"));
  return fresh && inside && !alerted;
}

export const financedCars = (state: DemoState, dealerId: string) =>
  state.cars.filter((c) => c.dealerId === dealerId && c.status !== "sold_paid");

export function portfolioStats(state: DemoState, dealerId: string) {
  const cars = financedCars(state, dealerId);
  const auto = cars.filter((c) => isAutoVerified(state, c));
  const pool = cars.filter((c) => c.status === "in_stock" && !auto.includes(c));
  const connected = cars.filter((c) => c.connected);
  const openAlerts = state.alerts.filter((a) => a.dealerId === dealerId && (a.status === "open" || a.status === "investigating"));
  return {
    cars,
    financedTotal: cars.reduce((s, c) => s + c.loanAmount, 0),
    autoVerified: auto,
    pool,
    connectedShare: cars.length ? connected.length / cars.length : 0,
    openAlerts,
  };
}

export function samplingFor(state: DemoState, dealer: Dealer) {
  const { cars, autoVerified, pool } = portfolioStats(state, dealer.id);
  const tier = TIERS[dealer.tier];
  const { p, confidence, maxCars } = tier.sampling;
  const perYear = tier.checkInsPerYear;
  const n = sampleSize(pool.length, p, confidence, perYear, maxCars);
  const M = missingToDetect(pool.length, p);
  const perCheckIn = pool.length ? detectionProbability(pool.length, M, n) : 0;
  const explanation: SamplingExplanation = {
    fleet: cars.length, autoVerified: autoVerified.length, pool: pool.length, n, p, confidence, missingToDetect: M,
    perYear, maxCars, perCheckIn,
    yearly: pool.length ? yearlyDetection(pool.length, M, n, perYear) : 0,
    expectedDays: Math.round(expectedDaysToDetect(perCheckIn, perYear)),
  };
  return { explanation, pool };
}

/**
 * Dealer risk score, 0 (no concern) – 100 (act now). Deliberately simple and explainable:
 *   base                                 20
 *   + open alerts                        high +35, medium +15, low +5 (each)
 *   + recent check-ins (last 6)          failed +12, skipped +6, clean −3 (each)
 *   + past resolved alerts in history    +6 each
 *   + unconnected share of portfolio     up to +15 (less live data = more uncertainty)
 * Clamped to 0–100.
 */
export function riskScore(state: DemoState, dealer: Dealer): { score: number; parts: { label: string; points: number }[] } {
  const parts: { label: string; points: number }[] = [{ label: "Base", points: 20 }];
  const { openAlerts, connectedShare } = portfolioStats(state, dealer.id);
  const sev = { high: 35, medium: 15, low: 5 } as const;
  const alertPts = openAlerts.reduce((s, a) => s + sev[a.severity], 0);
  if (alertPts) parts.push({ label: `${openAlerts.length} open alert${openAlerts.length > 1 ? "s" : ""}`, points: alertPts });

  const recent = dealer.history.filter((h) => h.kind === "check_in").slice(-6);
  const ciPts = recent.reduce((s, h) => s + (h.outcome === "failed" ? 12 : h.outcome === "skipped" ? 6 : h.outcome === "clean" ? -3 : 0), 0);
  if (recent.length) parts.push({ label: `Last ${recent.length} check-ins`, points: ciPts });

  const past = dealer.history.filter((h) => h.kind === "alert" && h.outcome === "resolved").length;
  if (past) parts.push({ label: `${past} past alert${past > 1 ? "s" : ""}`, points: past * 6 });

  parts.push({ label: `${Math.round(connectedShare * 100)}% connected`, points: Math.round((1 - connectedShare) * 15) });

  const score = Math.max(0, Math.min(100, parts.reduce((s, p) => s + p.points, 0)));
  return { score, parts };
}
