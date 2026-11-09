/**
 * The domain engine: demo state, seeded from data/seed.json, and every rule that changes it.
 * Isomorphic and framework-free. The server (src/server/db.ts) is the only place that runs the
 * mutations; browsers receive the resulting state and send actions by name over /api/actions.
 * Everything is a mock: feeds, email and the register are simulated, and the state is JSON in memory.
 */
import seed from "../../data/seed.json";
import type {
  Alert, AlertSource, Car, CheckIn, CheckInWindow, Dealer, DemoState, Geofence, PhotoCheck, Severity, ShotKind, SpotCheck, Tier, VisitCarResult,
} from "./types";
import { CLEAN_STREAK_TO_STEP_UP, physicalPlan, TIER_ORDER, TIERS, tierDown, tierUp } from "@/config/tiers";
import { visitFee } from "./costModel";
import { carRisk, samplingFor, weightedDraw } from "./risk";
import { distanceM } from "./geo";
import { dateFi, eur } from "./format";
import { ASSUMPTIONS } from "@/config/assumptions";

export const VERSION = 9;
const MIN = 60_000;
const HOUR = 60 * MIN;

export interface DemoFlags {
  simulateOnSite: boolean;
  nextPhotoUnreadable: boolean;
  autoVerifier: boolean;
  demoCamera: boolean;
  /** Server scheduler sends random check-ins and spot checks on a compressed demo clock. */
  autoSchedule: boolean;
}
export type Store = DemoState & { flags: DemoFlags };

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString().slice(0, 10);

export function buildInitialState(now = Date.now()): Store {
  const s = seed as unknown as {
    dealers: (Omit<Dealer, "cleanStreak" | "tierHistory">)[];
    cars: Car[];
    feeds: DemoState["feeds"];
    demo: DemoState["demo"];
  };
  return {
    version: VERSION,
    now: new Date(now).toISOString(),
    dealers: s.dealers.map((d) => ({
      ...d,
      // Clean check-ins since the last tier change.
      cleanStreak: d.history.slice(d.history.map((h) => h.kind).lastIndexOf("tier_change") + 1).filter((h) => h.kind === "check_in" && h.outcome === "clean").length,
      tierHistory: [{ date: d.history[0]?.date ?? "2026-01-01", tier: d.tier, reason: "Current tier at start of demo" }],
    })),
    cars: structuredClone(s.cars),
    feeds: { marketplace: structuredClone(s.feeds.marketplace), registry: structuredClone(s.feeds.registry) },
    alerts: [],
    checkIns: [],
    spotChecks: [],
    photoHashes: [],
    demo: s.demo,
    mail: [],
    events: [{ id: uid("ev"), at: new Date(now).toISOString(), text: "Demo reset to seed data" }],
    flags: { simulateOnSite: true, nextPhotoUnreadable: false, autoVerifier: false, demoCamera: true, autoSchedule: false },
  };
}

// ---------------------------------------------------------------- helpers
/** A rejected action (unknown id, wrong state, bad input). The API answers 409 with its message. */
export class ActionError extends Error {}

function must<T>(x: T | undefined, what: string): T {
  if (x === undefined) throw new ActionError(`Unknown ${what}`);
  return x;
}
const dealerOf = (s: Store, id: string) => must(s.dealers.find((d) => d.id === id), "dealer");
const carOf = (s: Store, vin: string) => must(s.cars.find((c) => c.vin === vin), "car");
const checkInOf = (s: Store, id: string) => must(s.checkIns.find((c) => c.id === id), "check-in");
const spotCheckOf = (s: Store, id: string) => must(s.spotChecks.find((v) => v.id === id), "spot check");
const alertOf = (s: Store, id: string) => must(s.alerts.find((a) => a.id === id), "alert");
const carLabel = (c: Car) => `${c.year} ${c.make} ${c.model} (${c.plate})`;
const isOpenAlert = (a: Alert) => a.status === "open" || a.status === "investigating";

function log(s: Store, text: string) {
  s.events.unshift({ id: uid("ev"), at: new Date().toISOString(), text });
  s.events = s.events.slice(0, 40);
}

function setTier(s: Store, d: Dealer, tier: Tier, reason: string) {
  if (d.tier === tier) return;
  d.tier = tier;
  d.cleanStreak = 0;
  d.tierHistory.push({ date: new Date().toISOString(), tier, reason });
  d.history.push({ id: uid("h"), date: today(), kind: "tier_change", outcome: "info", note: reason });
  log(s, `${d.name} → ${tier}: ${reason}`);
}

/**
 * One tier down (never below C) after a missed window, a failed check-in or a late payoff.
 * While an alert holds the dealer at C, the step down applies to the tier they return to.
 */
function stepDown(s: Store, d: Dealer, reason: string) {
  d.cleanStreak = 0;
  if (d.tierBeforeAlert) {
    const to = tierDown(d.tierBeforeAlert);
    if (to === d.tierBeforeAlert) return;
    d.tierBeforeAlert = to;
    d.history.push({ id: uid("h"), date: today(), kind: "tier_change", outcome: "info", note: `${reason}: back to ${to}, not ${tierUp(to)}, once the alert is cleared` });
    log(s, `${d.name}: returns to ${to} after the alert (${reason.toLowerCase()})`);
    return;
  }
  const to = tierDown(d.tier);
  if (to !== d.tier) setTier(s, d, to, `Moved down to ${to}: ${reason.toLowerCase()}`);
}

/** One unresolved high-severity alert moves the dealer straight to C until a bank officer clears it. */
function applyAlertRule(s: Store, d: Dealer) {
  const openHigh = s.alerts.some((a) => a.dealerId === d.id && a.severity === "high" && isOpenAlert(a));
  if (openHigh && d.tier !== "C") {
    d.tierBeforeAlert = d.tier;
    setTier(s, d, "C", "Moved to C: unresolved high-severity alert, more checks while the bank looks");
  }
}

// ---------------------------------------------------------------- check-in windows
const TZ = "Europe/Helsinki";
const fmtDay = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const fmtTime = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

/** "Today 13:00–15:00", "Tomorrow 09:00–11:00" or "Thu 19 Nov, 10:00–12:00". */
export function windowLabel(start: Date, end: Date, now = new Date()): string {
  const day = ymd(start) === ymd(now) ? "Today" : ymd(start) === ymd(new Date(now.getTime() + 24 * HOUR)) ? "Tomorrow" : `${fmtDay.format(start)},`;
  return `${day} ${fmtTime.format(start)}–${fmtTime.format(end)}`;
}

const WINDOW_MS = 2 * HOUR;
function makeWindow(start: Date): CheckInWindow {
  const end = new Date(start.getTime() + WINDOW_MS);
  return { id: uid("w"), label: windowLabel(start, end), start: start.toISOString(), end: end.toISOString() };
}

/** A window that opens now (rounded down to the quarter hour). The demo uses it so a check-in can run on stage. */
function windowNow(now = Date.now()): CheckInWindow {
  return makeWindow(new Date(Math.floor(now / (15 * MIN)) * 15 * MIN));
}

/** Hour of day in Helsinki for a UTC instant. */
const helsinkiHour = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d));

/**
 * A random 2-hour window on a working day within `days` days, between 09:00 and 17:00 Helsinki time.
 * This is how the bank sets windows in production, and how a reschedule is answered.
 */
function randomWorkingWindow(days: number, now = Date.now()): CheckInWindow {
  for (let tries = 0; tries < 50; tries++) {
    const day = 1 + Math.floor(Math.random() * days);
    const base = new Date(now + day * 24 * HOUR);
    const dow = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(base);
    if (dow === "Sat" || dow === "Sun") continue;
    const startHour = 9 + Math.floor(Math.random() * 7); // 09..15, so the window ends by 17:00
    // Move to the chosen hour in Helsinki time.
    const d = new Date(base);
    d.setUTCMinutes(0, 0, 0);
    d.setUTCHours(d.getUTCHours() + (startHour - helsinkiHour(d)));
    return makeWindow(d);
  }
  return windowNow(now + 24 * HOUR);
}

const fourDigits = () => String(1000 + Math.floor(Math.random() * 9000));

function createCheckIn(s: Store, dealerId: string, reason: CheckIn["reason"], targetVin?: string, window = windowNow()): CheckIn {
  const d = dealerOf(s, dealerId);
  const ci: CheckIn = { id: uid("ci"), dealerId, createdAt: new Date().toISOString(), reason, targetVin, status: "scheduled", window, sampledVins: [], results: {} };
  s.checkIns.unshift(ci);
  sendMail(s, d, ci);
  return ci;
}

/** Mock email with a personal link (the bank shows it with a QR code). Nothing is actually sent. */
function sendMail(s: Store, d: Dealer, ci: CheckIn, again = false) {
  const targeted = ci.reason === "targeted";
  s.mail.unshift({
    id: uid("m"), at: new Date().toISOString(), dealerId: d.id, checkInId: ci.id,
    subject: again ? `New time for your check-in: ${ci.window.label}` : targeted ? `One quick photo, ${ci.window.label}` : `Quick check-in, ${ci.window.label}`,
    body: `Hi ${d.name}, we'd like to do a quick check-in of ${targeted ? "one car" : "a few cars"}, ${ci.window.label}. It takes about 2 minutes a car. Open the link on your phone when you're at the lot.${again ? "" : " If the time doesn't suit you, you can ask for another one in the app."}`,
    link: `/dealer?d=${d.id}&ci=${ci.id}`,
  });
  s.mail = s.mail.slice(0, 60);
}

function raiseAlert(s: Store, a: Omit<Alert, "id" | "createdAt" | "status" | "step">): Alert {
  const alert: Alert = { ...a, id: uid("al"), createdAt: new Date().toISOString(), status: "open", step: "signal" };
  s.alerts.unshift(alert);
  const d = dealerOf(s, a.dealerId);
  log(s, `${a.severity.toUpperCase()} alert · ${d.name}: ${a.message}`);
  // A car a check-in couldn't confirm gets a friendly, targeted check-in for that one car.
  // Never for a sale: the car has left the lot, so there's nothing to photograph.
  if (a.severity === "medium" && a.source === "check_in") {
    const ci = createCheckIn(s, a.dealerId, "targeted", a.vin);
    alert.step = "targeted_check_in";
    alert.targetedCheckInId = ci.id;
    log(s, `Targeted check-in sent to ${d.name} for ${a.vin}`);
  }
  // High severity: the next random spot check moves to today with this car added, and the officer
  // is asked to pause credit (only the officer can).
  if (a.severity === "high") {
    alert.recommendPause = !d.creditPaused;
    if (a.source !== "spot_check") bringVisitForward(s, alert);
  }
  applyAlertRule(s, d);
  return alert;
}

// ---------------------------------------------------------------- spot checks
const openVisit = (s: Store, dealerId: string) => s.spotChecks.find((v) => v.dealerId === dealerId && v.verifier.status !== "reported");

/** Cars that passed a self-check recently and are still in stock: candidates for a random re-check. */
function recentlyPassed(s: Store, dealerId: string): string[] {
  const out: string[] = [];
  for (const ci of s.checkIns) {
    if (ci.dealerId !== dealerId || ci.status !== "completed") continue;
    for (const vin of ci.sampledVins) {
      const r = ci.results[vin];
      if (r && !("skipped" in r) && r.verified && carOf(s, vin).status === "in_stock" && !out.includes(vin)) out.push(vin);
    }
  }
  return out;
}

/**
 * n in-stock cars ranked by the risk model (weighted, never certain), plus must-include cars, shuffled.
 * One slot goes to a random re-check of a car that recently passed a self-check, when there is one.
 */
function drawVisitCars(s: Store, dealerId: string, n: number, mustInclude: string[] = []): { vins: string[]; recheck: string[] } {
  const recheckPool = recentlyPassed(s, dealerId).filter((v) => !mustInclude.includes(v));
  const recheck = recheckPool.length ? weightedDraw(recheckPool, () => 1, 1) : [];
  const stock = s.cars.filter((c) => c.dealerId === dealerId && c.status === "in_stock" && !mustInclude.includes(c.vin) && !recheck.includes(c.vin));
  const drawn = weightedDraw(stock, (c) => carRisk(s, c).weight, Math.max(0, n - recheck.length)).map((c) => c.vin);
  const vins = [...drawn, ...recheck, ...mustInclude];
  return { vins: weightedDraw(vins, () => 1, vins.length), recheck };
}

function createSpotCheck(s: Store, dealerId: string, reason: SpotCheck["reason"], alert?: Alert): SpotCheck {
  const d = dealerOf(s, dealerId);
  const stock = s.cars.filter((c) => c.dealerId === dealerId && c.status === "in_stock").length;
  const { vins, recheck } = drawVisitCars(s, dealerId, Math.max(1, physicalPlan(d.tier, stock).carsPerVisit), alert ? [alert.vin] : []);
  const now = new Date().toISOString();
  const v: SpotCheck = {
    id: uid("sc"), dealerId, createdAt: now, reason, alertIds: alert ? [alert.id] : [], sampledVins: vins, recheckVins: recheck, results: {},
    verifier: { dispatchedAt: now, name: pickVerifier(d.city), status: "offered", visitCode: `AV-${fourDigits()}`, fee: visitFee(vins.length) },
  };
  s.spotChecks.unshift(v);
  return v;
}

/** Alerts don't create a special visit: they pull the next random one forward and add the flagged car. */
function bringVisitForward(s: Store, a: Alert) {
  const d = dealerOf(s, a.dealerId);
  let v = openVisit(s, a.dealerId);
  if (v) {
    if (!v.sampledVins.includes(a.vin)) {
      const at = Math.floor(Math.random() * (v.sampledVins.length + 1));
      v.sampledVins.splice(at, 0, a.vin);
      v.verifier.fee = visitFee(v.sampledVins.length);
    }
    if (!v.alertIds.includes(a.id)) v.alertIds.push(a.id);
    v.reason = "brought_forward";
    log(s, `${a.vin} added to today's spot check at ${d.name}`);
  } else {
    v = createSpotCheck(s, a.dealerId, "brought_forward", a);
    log(s, `Next spot check at ${d.name} brought forward to today (${v.sampledVins.length} cars, ${eur(v.verifier.fee)})`);
  }
  a.step = "visit";
  a.status = "investigating";
  a.spotCheckId = v.id;
}

function describeVisitCar(r: VisitCarResult | undefined, simulated?: boolean): string {
  if (!r) return "Not checked";
  if (r.status === "missing") return `Car not on the lot${r.reason ? `. ${r.reason}` : ""}`;
  if (!r.photo) return `Car found on the lot${simulated ? " (simulated report)" : ""}`;
  if (!r.photo.verified) return "Car found, but the photos could not be confirmed";
  const km = r.photo.odometer?.readKm;
  return `Car found: VIN plate, car and odometer photographed and matched${km != null ? `, odometer ${km.toLocaleString("en")} km` : ""}`;
}

function finishSpotCheck(s: Store, v: SpotCheck) {
  const d = dealerOf(s, v.dealerId);
  v.verifier.status = "reported";
  v.verifier.reportedAt = new Date().toISOString();
  const bad = v.sampledVins.filter((vin) => { const r = v.results[vin]; return !r || r.status === "missing" || (r.photo && !r.photo.verified); });
  v.outcome = bad.length ? "failed" : "clean";
  for (const vin of v.sampledVins) if (!bad.includes(vin)) carOf(s, vin).lastCheckedAt = today();
  d.history.push({
    id: uid("h"), date: today(), kind: "verifier", outcome: v.outcome === "clean" ? "clean" : "failed",
    note: `Spot check: ${v.sampledVins.length - bad.length} of ${v.sampledVins.length} cars confirmed${v.verifier.simulated ? " (simulated)" : ""}`,
  });
  // Answer the alerts that brought the visit forward.
  for (const id of v.alertIds) {
    const a = s.alerts.find((x) => x.id === id);
    if (a) a.evidence.push({ label: "Spot check", value: describeVisitCar(v.results[a.vin], v.verifier.simulated) });
  }
  // Anything else the verifier couldn't confirm becomes a new alert.
  for (const vin of bad) {
    if (v.alertIds.some((id) => s.alerts.find((x) => x.id === id)?.vin === vin)) continue;
    if (s.alerts.some((a) => a.vin === vin && isOpenAlert(a))) continue;
    const r = v.results[vin];
    const missing = !r || r.status === "missing";
    const recheck = v.recheckVins?.includes(vin);
    const a = raiseAlert(s, {
      dealerId: d.id, vin, source: "spot_check", severity: missing ? "high" : "medium",
      message: recheck
        ? `Passed a self-check, but ${missing ? "not on the lot" : "not confirmed"} at a spot check`
        : missing ? `Car not on the lot at a spot check${r?.status === "missing" && r.reason ? ` (${r.reason.toLowerCase()})` : ""}` : "Car at a spot check could not be confirmed",
      evidence: [...feedEvidence(s, vin), { label: "Spot check", value: describeVisitCar(r, v.verifier.simulated) }, ...(recheck ? [{ label: "Random re-check", value: "This car passed a recent self-check" }] : [])],
    });
    a.step = "visit";
    a.spotCheckId = v.id;
  }
  log(s, `Spot check at ${d.name}: ${v.sampledVins.length - bad.length}/${v.sampledVins.length} cars confirmed${bad.length ? " ✗" : " ✓"}`);
}

/** How sure the (simulated) data model is that a marketplace listing is this financed car. Stable per VIN. */
const listingMatch = (vin: string) => 0.86 + ([...vin].reduce((a, c) => a + c.charCodeAt(0), 0) % 12) / 100;

function feedEvidence(s: Store, vin: string): { label: string; value: string }[] {
  const car = carOf(s, vin);
  const d = dealerOf(s, car.dealerId);
  const ev: { label: string; value: string }[] = [
    { label: "Car", value: carLabel(car) },
    { label: "Open loan", value: `${eur(car.loanAmount)} since ${car.loanOpenedAt}` },
    { label: "Last confirmed", value: car.lastCheckedAt ? dateFi(car.lastCheckedAt) : "Never" },
  ];
  const m = s.feeds.marketplace[vin];
  if (m?.listed) {
    ev.push({ label: "Marketplace", value: `${m.listingTitle ?? carLabel(car)}${m.price ? ` · ${eur(m.price)}` : ""} · ${m.status.toUpperCase()}` });
    ev.push({ label: "Data model", value: `Listing matched to this VIN by make, model, year and colour (${Math.round(listingMatch(vin) * 100)}% sure)` });
  }
  const r = s.feeds.registry[vin];
  ev.push({ label: "Register", value: r ? `${r.pending ? "PENDING owner change → " : "Owner: "}${r.owner} · ${r.lastOwnerChange}` : `Owner: ${d.name} (no change)` });
  return ev;
}

// ---------------------------------------------------------------- payoffs
/** Same time of day, n business days later (n < 0: earlier). Weekends skipped; public holidays ignored. */
function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from);
  const step = Math.sign(n);
  for (let left = Math.abs(n); left > 0;) {
    d.setDate(d.getDate() + step);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}

/** A sale is normal business: the dealer gets ASSUMPTIONS.payoffBusinessDays to repay before anything is raised. */
function startPayoffClock(s: Store, car: Car, via: "marketplace" | "registry") {
  if (car.status !== "in_stock") return;
  const now = new Date();
  car.status = "sold_awaiting_payoff";
  car.sale = { seenAt: now.toISOString(), via, payoffDueAt: addBusinessDays(now, ASSUMPTIONS.payoffBusinessDays).toISOString() };
  log(s, `${via === "marketplace" ? "Marketplace: listed as sold" : "Register: owner change"} · ${car.vin} at ${dealerOf(s, car.dealerId).name}, payoff reminder sent, due ${dateFi(car.sale.payoffDueAt)}`);
}

/** Both sources show the sale: the marketplace says sold and the register shows a new or pending owner. */
function bothSourcesAgree(s: Store, car: Car): boolean {
  const m = s.feeds.marketplace[car.vin];
  const r = s.feeds.registry[car.vin];
  return m?.status === "sold" && !!r && (r.pending || r.owner !== dealerOf(s, car.dealerId).name);
}

/** Sold cars past their payoff deadline become alerts: medium on one source, high when both agree. */
function checkPayoffs(s: Store, now = Date.now()) {
  for (const car of s.cars) {
    if (car.status !== "sold_awaiting_payoff" || !car.sale || Date.parse(car.sale.payoffDueAt) > now) continue;
    if (s.alerts.some((a) => a.vin === car.vin && isOpenAlert(a))) continue;
    const both = bothSourcesAgree(s, car);
    raiseAlert(s, {
      dealerId: car.dealerId, vin: car.vin, source: car.sale.via,
      severity: both ? "high" : "medium",
      message: `Sold, no payoff after ${ASSUMPTIONS.payoffBusinessDays} business days${both ? " (marketplace and register agree)" : ""}`,
      evidence: [{ label: "Sold", value: dateFi(car.sale.seenAt) }, { label: "Payoff due", value: `${dateFi(car.sale.payoffDueAt)}, not received` }, ...feedEvidence(s, car.vin)],
    });
  }
}

/** Windows that passed without a start: the check-in counts as skipped. */
function checkMissedWindows(s: Store, now = Date.now()) {
  for (const ci of s.checkIns) {
    if (ci.status !== "scheduled" || Date.parse(ci.window.end) > now) continue;
    const d = dealerOf(s, ci.dealerId);
    ci.status = "missed";
    ci.completedAt = new Date(now).toISOString();
    ci.outcome = "failed";
    d.cleanStreak = 0;
    d.history.push({ id: uid("h"), date: today(), kind: "check_in", outcome: "skipped", note: ci.rescheduled ? "Second window missed" : "Check-in window missed" });
    log(s, `${d.name} missed the check-in window (${ci.window.label})${ci.rescheduled ? ", after a reschedule" : ""}`);
    stepDown(s, d, "Missed a check-in window");
  }
}

/** Whether the server's ticker has anything to do (keeps idle ticks cheap). */
export function needsTick(s: Store, now = Date.now()): boolean {
  return s.flags.autoSchedule || s.flags.autoVerifier
    || s.checkIns.some((c) => c.status === "scheduled" && Date.parse(c.window.end) <= now)
    || s.cars.some((c) => c.status === "sold_awaiting_payoff" && !!c.sale && Date.parse(c.sale.payoffDueAt) <= now && !s.alerts.some((a) => a.vin === c.vin && isOpenAlert(a)));
}

/** Rules that decide whether a photographed car counts as a hard fail, or only needs a person to look. */
function unverifiedReason(r: PhotoCheck): { severity: Severity; text: string } {
  if (r.vinMatch === "mismatch") return { severity: "medium", text: `VIN doesn't match (read: ${r.readVin ?? "none"})` };
  if (r.plate && !r.plate.match && r.plate.read) return { severity: "medium", text: `plate doesn't match (read: ${r.plate.read})` };
  if (r.code && r.code.read && !r.code.match) return { severity: "medium", text: `wrong one-time code in the photo (read: ${r.code.read})` };
  if (r.reuse.duplicate) return { severity: "medium", text: "photo matches an earlier photo" };
  if (!r.location?.inside) return { severity: "medium", text: "photographed away from the dealer's lot" };
  if (!r.freshness.insideWindow) return { severity: "medium", text: "photographed outside the check-in window" };
  if (r.odometer && !r.odometer.plausible && r.odometer.readKm != null) return { severity: "medium", text: `odometer jumped ${r.odometer.deltaKm} km` };
  return { severity: "low", text: `needs a look: ${(r.needsLook ?? ["the photos weren't clear"]).join(", ")}` };
}

// ---------------------------------------------------------------- actions
export const ops = {
  setFlag(s: Store, k: keyof DemoFlags, v: boolean) {
    if (!(k in s.flags) || typeof v !== "boolean") throw new ActionError("Unknown flag");
    s.flags[k] = v;
  },

  /** Random check-in request with a window set by the bank. In the demo the window opens now, so it can run on stage. */
  sendCheckIn(s: Store, dealerId: string) {
    const ci = createCheckIn(s, dealerId, "random");
    log(s, `Check-in sent to ${dealerOf(s, dealerId).name}: ${ci.window.label} (email sent)`);
  },

  /** The dealer can't make the window: one new window, set by the bank, within 2 weeks. */
  requestAnotherTime(s: Store, id: string) {
    const ci = checkInOf(s, id);
    if (ci.status !== "scheduled") throw new ActionError("Check-in already started");
    if (ci.rescheduled) throw new ActionError("Already rescheduled once");
    const previous = ci.window;
    ci.window = randomWorkingWindow(14);
    ci.rescheduled = { at: new Date().toISOString(), previous };
    const d = dealerOf(s, ci.dealerId);
    sendMail(s, d, ci, true);
    log(s, `${d.name} asked for another time; new window ${ci.window.label}`);
  },

  /** Demo helper: move a scheduled window to now, so a rescheduled check-in can run on stage. */
  openWindowNow(s: Store, id: string) {
    const ci = checkInOf(s, id);
    if (ci.status !== "scheduled") throw new ActionError("Check-in not waiting for its window");
    ci.window = windowNow();
    log(s, `Demo: ${dealerOf(s, ci.dealerId).name}'s check-in window moved to now`);
  },

  /** Cars and the one-time code appear only now, so the dealer can't prepare specific cars. */
  startCheckIn(s: Store, id: string) {
    const ci = checkInOf(s, id);
    if (ci.status === "in_progress") return;
    if (ci.status !== "scheduled") throw new ActionError("Check-in is closed");
    const now = Date.now();
    if (now < Date.parse(ci.window.start) - 15 * MIN) throw new ActionError(`The window opens ${ci.window.label}`);
    if (now > Date.parse(ci.window.end)) throw new ActionError("The window has passed");
    const d = dealerOf(s, ci.dealerId);
    if (ci.reason === "targeted" && ci.targetVin) {
      ci.sampledVins = [ci.targetVin];
    } else {
      const { explanation, pool } = samplingFor(s, d);
      ci.sampling = explanation;
      ci.sampledVins = weightedDraw(pool, (c) => carRisk(s, c, now).weight, explanation.n).map((c) => c.vin);
    }
    ci.code = fourDigits();
    ci.status = "in_progress";
    ci.startedAt = new Date().toISOString();
    log(s, `${d.name} started a check-in: ${ci.sampledVins.length} car${ci.sampledVins.length === 1 ? "" : "s"} drawn by risk, code ${ci.code}`);
  },

  /** Server only: written by /api/check-photo after it has run the checks. */
  recordPhoto(s: Store, id: string, vin: string, check: PhotoCheck, hashes: string[]) {
    const ci = openCheckInCar(s, id, vin);
    ci.results[vin] = check;
    rememberHashes(s, ci.dealerId, vin, check, hashes);
    if (!check.verified) s.flags.nextPhotoUnreadable = false;
  },

  skipCar(s: Store, id: string, vin: string) {
    const ci = openCheckInCar(s, id, vin);
    ci.results[vin] = { skipped: true };
  },

  completeCheckIn(s: Store, id: string) {
    const ci = checkInOf(s, id);
    if (ci.status === "completed") return;
    if (ci.status !== "in_progress") throw new ActionError("Check-in not started");
    const d = dealerOf(s, ci.dealerId);
    const verified = ci.sampledVins.filter((v) => { const r = ci.results[v]; return r && !("skipped" in r) && r.verified; });
    const unverified = ci.sampledVins.filter((v) => !verified.includes(v));
    ci.status = "completed";
    ci.completedAt = new Date().toISOString();
    ci.outcome = unverified.length === 0 ? "clean" : verified.length === 0 ? "failed" : "partial";
    for (const vin of verified) carOf(s, vin).lastCheckedAt = today();

    d.history.push({
      id: uid("h"), date: today(), kind: "check_in",
      outcome: ci.outcome === "clean" ? "clean" : unverified.every((v) => { const r = ci.results[v]; return r && "skipped" in r; }) ? "skipped" : "failed",
      note: `${verified.length} of ${ci.sampledVins.length} car${ci.sampledVins.length === 1 ? "" : "s"} verified${ci.reason === "targeted" ? " (targeted)" : ""}${ci.rescheduled ? ", after a reschedule" : ""}`,
    });
    log(s, `${d.name} completed a check-in: ${verified.length}/${ci.sampledVins.length} verified`);

    // A targeted check-in answers its alert.
    if (ci.reason === "targeted") {
      const alert = s.alerts.find((a) => a.targetedCheckInId === ci.id);
      if (alert) alert.evidence.push({ label: "Targeted check-in", value: verified.length ? "Dealer photographed the car on the lot ✓" : "Car could not be confirmed by the dealer" });
    }

    if (ci.outcome === "clean") {
      d.cleanStreak += 1;
      // No step up while an alert holds the dealer at C: only the bank lifts that.
      if (d.cleanStreak >= CLEAN_STREAK_TO_STEP_UP && !d.tierBeforeAlert && d.tier !== "A+") {
        const to = tierUp(d.tier);
        setTier(s, d, to, `Moved up to ${to}: ${CLEAN_STREAK_TO_STEP_UP} clean check-ins in a row`);
      }
    } else {
      stepDown(s, d, ci.outcome === "failed" ? "Check-in failed" : "Check-in not clean");
      if (ci.reason === "targeted") return; // its alert already carries the result
      for (const vin of unverified) {
        if (s.alerts.some((a) => a.vin === vin && isOpenAlert(a))) continue;
        const r = ci.results[vin];
        const { severity, text } = !r || "skipped" in r ? { severity: "low" as const, text: "skipped at check-in" } : unverifiedReason(r);
        raiseAlert(s, { dealerId: d.id, vin, source: "check_in", severity, message: `Car not verified: ${text}`, evidence: feedEvidence(s, vin) });
      }
    }
  },

  // ----- simulated feed events (fired from /demo)

  marketplaceSold(s: Store, vin: string, status: "sold" | "removed" = "sold") {
    const car = carOf(s, vin);
    const d = dealerOf(s, car.dealerId);
    const m = (s.feeds.marketplace[vin] ??= { listed: true, status: "active" });
    m.listed = true;
    m.status = status;
    m.changedAt = new Date().toISOString();
    // A removed listing proves nothing on its own: just watch it.
    if (status === "removed") return void log(s, `Marketplace: listing removed for ${vin} at ${d.name}`);
    // Demo scenario: the register also shows a pending owner change, so both sources agree.
    if (car.demoScenario === "sold_out_of_trust") s.feeds.registry[vin] = { owner: "Private person, Jämsä", lastOwnerChange: today(), pending: true };
    startPayoffClock(s, car, "marketplace");
  },

  registryOwnerChange(s: Store, vin: string) {
    const car = carOf(s, vin);
    s.feeds.registry[vin] = { owner: "Private person", lastOwnerChange: today(), pending: false };
    startPayoffClock(s, car, "registry");
  },

  /** The dealer repays a loan: for a sold car, or early for one still on the lot. */
  payoffReceived(s: Store, vin: string) {
    const car = carOf(s, vin);
    if (car.status === "sold_paid" || car.status === "paid_off") return;
    const d = dealerOf(s, car.dealerId);
    const sold = car.status !== "in_stock";
    car.status = sold ? "sold_paid" : "paid_off";
    car.paidAt = new Date().toISOString();
    const late = sold && car.sale && Date.parse(car.sale.payoffDueAt) < Date.now();
    d.history.push({ id: uid("h"), date: today(), kind: "payoff", outcome: late ? "info" : "clean", note: `Paid off ${car.make} ${car.model} (${eur(car.loanAmount)})${sold ? "" : " before sale"}${late ? ", late" : ""}` });
    for (const a of s.alerts) if (a.vin === vin && isOpenAlert(a)) a.evidence.push({ label: "Payoff", value: `Received ${today()}` });
    log(s, `Payoff received: ${vin} at ${d.name}${sold ? "" : " (before sale)"}`);
    if (late) stepDown(s, d, "Late payoff");
  },

  /** Demo: jump to the payoff deadline of a sold car. */
  payoffDeadlinePasses(s: Store, vin: string) {
    const car = carOf(s, vin);
    if (car.status !== "sold_awaiting_payoff" || !car.sale) throw new ActionError("No payoff pending for this car");
    const now = new Date();
    car.sale.seenAt = addBusinessDays(now, -ASSUMPTIONS.payoffBusinessDays).toISOString();
    car.sale.payoffDueAt = now.toISOString();
    checkPayoffs(s);
  },

  // ----- bank actions (escalation ladder + human review)

  /** Bank officer: bring the next random spot check forward for a medium or low alert. */
  bringVisitForward(s: Store, alertId: string) {
    const a = alertOf(s, alertId);
    bringVisitForward(s, a);
  },

  /** Officer only: pause further drawdowns on the dealer's credit line. */
  pauseCredit(s: Store, dealerId: string, alertId?: string) {
    const d = dealerOf(s, dealerId);
    if (d.creditPaused) return;
    const a = alertId ? alertOf(s, alertId) : undefined;
    d.creditPaused = { at: new Date().toISOString(), reason: a ? a.message : "Paused by a bank officer" };
    for (const x of s.alerts) if (x.dealerId === dealerId) x.recommendPause = false;
    d.history.push({ id: uid("h"), date: today(), kind: "alert", outcome: "info", note: "Credit paused by a bank officer" });
    log(s, `Bank officer paused credit for ${d.name}`);
  },

  resumeCredit(s: Store, dealerId: string) {
    const d = dealerOf(s, dealerId);
    if (!d.creditPaused) return;
    d.creditPaused = undefined;
    d.history.push({ id: uid("h"), date: today(), kind: "alert", outcome: "info", note: "Credit resumed by a bank officer" });
    log(s, `Bank officer resumed credit for ${d.name}`);
  },

  /** Random, unannounced spot check. In production the schedule draws these; here the demo panel does. */
  sendSpotCheck(s: Store, dealerId: string) {
    if (openVisit(s, dealerId)) return;
    const v = createSpotCheck(s, dealerId, "random");
    log(s, `Random spot check posted for ${dealerOf(s, dealerId).name} (${v.sampledVins.length} cars${v.recheckVins?.length ? ", 1 re-check" : ""}, ${eur(v.verifier.fee)})`);
  },

  // ----- freelance verifier app (/verifier)

  verifierAccept(s: Store, id: string) {
    const v = spotCheckOf(s, id);
    if (v.verifier.status === "en_route") return;
    if (v.verifier.status !== "offered") throw new ActionError("Spot check already taken");
    v.verifier.status = "en_route";
    v.verifier.acceptedAt = new Date().toISOString();
    log(s, `${v.verifier.name} accepted the spot check at ${dealerOf(s, v.dealerId).name}`);
  },

  /** The server decides whether the phone is on the lot. Returns where it placed the verifier. */
  verifierArrive(s: Store, id: string, pos: Position | null): { inside: boolean; distanceM: number | null } {
    const v = spotCheckOf(s, id);
    if (v.verifier.status === "on_site") return { inside: true, distanceM: v.verifier.arrival?.distanceM ?? null };
    if (v.verifier.status !== "en_route") throw new ActionError("Spot check not accepted");
    const arrival = locateOnLot(dealerOf(s, v.dealerId).geofence, pos ? [pos] : [null], s.flags.simulateOnSite);
    if (!arrival?.inside) return { inside: false, distanceM: arrival?.distanceM ?? null };
    v.verifier.status = "on_site";
    v.verifier.arrivedAt = new Date().toISOString();
    v.verifier.arrival = arrival;
    log(s, `${v.verifier.name} checked in on site at ${dealerOf(s, v.dealerId).name}${arrival.simulated ? " (simulated location)" : ""}`);
    return { inside: true, distanceM: arrival.distanceM };
  },

  /** Verifier marks a car missing, or clears its result to retake it. Found cars come from recordVisitPhoto. */
  verifierCar(s: Store, id: string, vin: string, result: { status: "missing"; reason?: string } | null) {
    const v = onSiteCar(s, id, vin);
    if (result === null) delete v.results[vin];
    else if (result.status === "missing") v.results[vin] = { status: "missing", reason: typeof result.reason === "string" ? result.reason.slice(0, 200) : undefined };
    else throw new ActionError("Invalid result");
  },

  /** Server only: written by /api/check-photo for a car at a spot check. */
  recordVisitPhoto(s: Store, id: string, vin: string, check: PhotoCheck, hashes: string[]) {
    const v = onSiteCar(s, id, vin);
    v.results[vin] = { status: "found", photo: check };
    rememberHashes(s, v.dealerId, vin, check, hashes);
    if (!check.verified) s.flags.nextPhotoUnreadable = false;
  },

  verifierSubmit(s: Store, id: string, note?: string) {
    const v = spotCheckOf(s, id);
    if (v.verifier.status === "reported") return;
    if (v.verifier.status !== "on_site") throw new ActionError("Not on site");
    if (v.sampledVins.some((vin) => !v.results[vin])) throw new ActionError("Some cars are not checked yet");
    if (typeof note === "string" && note.trim()) v.verifier.note = note.trim().slice(0, 500);
    finishSpotCheck(s, v);
  },

  /** Auto-completed report (flag "autoVerifier", or "Simulate report" on the bank). */
  verifierReport(s: Store, id: string) {
    const v = spotCheckOf(s, id);
    if (v.verifier.status === "reported") return;
    const now = new Date().toISOString();
    Object.assign(v.verifier, { simulated: true, acceptedAt: v.verifier.acceptedAt ?? now, arrivedAt: v.verifier.arrivedAt ?? now });
    for (const vin of v.sampledVins) {
      if (v.results[vin]) continue;
      // Demo: sold cars still awaiting payoff are not on the lot.
      const car = carOf(s, vin);
      const gone = car.demoScenario === "sold_out_of_trust" || car.status === "sold_awaiting_payoff";
      v.results[vin] = gone ? { status: "missing", reason: "Staff said it was out on a test drive; no test-drive record" } : { status: "found" };
    }
    finishSpotCheck(s, v);
  },

  escalateToAuditor(s: Store, alertId: string) {
    const a = alertOf(s, alertId);
    a.step = "auditor";
    a.status = "investigating";
    log(s, `Full count ordered at ${dealerOf(s, a.dealerId).name} (${a.vin})`);
  },

  /** Human decision at the bank. Only this changes loan status or lifts an alert's move to C. */
  resolveAlert(s: Store, alertId: string, outcome: "resolved_ok" | "confirmed_fraud") {
    const a = alertOf(s, alertId);
    const d = dealerOf(s, a.dealerId);
    a.status = outcome;
    a.recommendPause = false;
    d.history.push({ id: uid("h"), date: today(), kind: "alert", outcome: outcome === "resolved_ok" ? "resolved" : "failed", note: `${a.message} (${outcome === "resolved_ok" ? "cleared by bank" : "confirmed sold out of trust"})` });
    if (outcome === "confirmed_fraud") {
      carOf(s, a.vin).status = "sold_unpaid_suspect";
      log(s, `Bank confirmed sold out of trust: ${a.vin} at ${d.name}`);
    } else {
      log(s, `Bank cleared alert for ${a.vin} at ${d.name}`);
      const stillHigh = s.alerts.some((x) => x.dealerId === d.id && x.severity === "high" && isOpenAlert(x));
      if (!stillHigh && d.tierBeforeAlert) {
        const back = d.tierBeforeAlert;
        d.tierBeforeAlert = undefined;
        setTier(s, d, back, `Back to ${back}: alert cleared by bank review`);
      }
    }
  },

  /** Manual tier override by a bank officer. */
  overrideTier(s: Store, dealerId: string, tier: Tier) {
    if (!TIER_ORDER.includes(tier)) throw new ActionError("Unknown tier");
    const d = dealerOf(s, dealerId);
    d.tierBeforeAlert = undefined;
    setTier(s, d, tier, `Set to ${tier} manually by account manager`);
  },

  /**
   * Server only, every few seconds. Runs the payoff clock and missed windows, and stands in for the
   * production schedule:
   *  - with `autoSchedule`, random check-ins and spot checks arrive at each tier's yearly rate on a
   *    compressed clock (one demo year = DEMO_YEAR_MS);
   *  - with `autoVerifier`, open spot checks get a simulated report a few seconds after dispatch.
   */
  tick(s: Store, elapsedMs: number, now = Date.now()) {
    checkPayoffs(s, now);
    checkMissedWindows(s, now);
    if (s.flags.autoVerifier) {
      for (const v of s.spotChecks) {
        if (v.verifier.status !== "reported" && now - Date.parse(v.verifier.dispatchedAt) >= AUTO_REPORT_MS) ops.verifierReport(s, v.id);
      }
    }
    if (!s.flags.autoSchedule) return;
    const share = Math.min(1, elapsedMs / DEMO_YEAR_MS);
    for (const d of s.dealers) {
      const t = TIERS[d.tier];
      const openCheckIn = s.checkIns.some((c) => c.dealerId === d.id && c.reason === "random" && (c.status === "scheduled" || c.status === "in_progress"));
      if (!openCheckIn && Math.random() < t.checkInsPerYear * share) {
        const ci = createCheckIn(s, d.id, "random");
        log(s, `Schedule: check-in sent to ${d.name}, ${ci.window.label}`);
      }
      const stock = s.cars.filter((c) => c.dealerId === d.id && c.status === "in_stock").length;
      if (!openVisit(s, d.id) && stock > 0 && Math.random() < physicalPlan(d.tier, stock).visits * share) {
        const v = createSpotCheck(s, d.id, "random");
        log(s, `Schedule: random spot check posted for ${d.name} (${v.sampledVins.length} cars, ${eur(v.verifier.fee)})`);
      }
    }
  },
};

/** Actions a browser may send. The rest are written by the server itself. */
export const CLIENT_OPS = [
  "setFlag", "sendCheckIn", "requestAnotherTime", "openWindowNow", "startCheckIn", "skipCar", "completeCheckIn",
  "marketplaceSold", "registryOwnerChange", "payoffReceived", "payoffDeadlinePasses",
  "bringVisitForward", "pauseCredit", "resumeCredit", "sendSpotCheck", "verifierAccept", "verifierArrive", "verifierCar", "verifierSubmit",
  "verifierReport", "escalateToAuditor", "resolveAlert", "overrideTier",
] as const satisfies readonly (keyof typeof ops)[];
export type ClientOp = (typeof CLIENT_OPS)[number];
export type OpArgs<K extends keyof typeof ops> = (typeof ops)[K] extends (s: Store, ...a: infer A) => unknown ? A : never;
export type OpResult<K extends keyof typeof ops> = ReturnType<(typeof ops)[K]>;

/** One demo year on the scheduler's compressed clock. */
export const DEMO_YEAR_MS = 10 * 60_000;
const AUTO_REPORT_MS = 6000;

const SHOTS: ShotKind[] = ["vin", "car", "odometer"];
function rememberHashes(s: Store, dealerId: string, vin: string, check: PhotoCheck, hashes: string[]) {
  hashes.forEach((hash, i) => s.photoHashes.push({ hash, dealerId, vin, at: check.freshness.receivedAt, kind: SHOTS[i] }));
}

function openCheckInCar(s: Store, id: string, vin: string) {
  const ci = checkInOf(s, id);
  if (ci.status !== "in_progress") throw new ActionError("Check-in not in progress");
  if (!ci.sampledVins.includes(vin)) throw new ActionError("Car not in this check-in");
  return ci;
}

function onSiteCar(s: Store, id: string, vin: string) {
  const v = spotCheckOf(s, id);
  if (v.verifier.status !== "on_site") throw new ActionError("Not on site");
  if (!v.sampledVins.includes(vin)) throw new ActionError("Car not in this spot check");
  return v;
}

export interface Position { lat: number; lng: number; accuracy: number }

/**
 * Is the phone on the lot? Read from the dealer's (or verifier's) phone while the form is filled in.
 * Every fix must be inside the lot area (with up to 150 m slack for accuracy); the farthest one is
 * reported. With `simulateOnSite` (stage demo far from the dealer) a missing or outside fix is
 * replaced by a point on the lot, labelled simulated.
 */
export function locateOnLot(f: Geofence, positions: (Position | null)[], simulateOnSite: boolean): PhotoCheck["location"] {
  const fixes = positions.filter((p): p is Position => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  let location: PhotoCheck["location"] = null;
  if (fixes.length === positions.length && fixes.length > 0) {
    const slack = (p: Position) => Math.min(Math.max(p.accuracy || 0, 0), 150);
    const worst = fixes.map((p) => ({ p, d: distanceM(p, f) })).reduce((m, x) => (x.d - slack(x.p) > m.d - slack(m.p) ? x : m));
    location = {
      lat: worst.p.lat, lng: worst.p.lng, accuracyM: Math.round(worst.p.accuracy), distanceM: Math.round(worst.d),
      inside: worst.d <= f.radiusM + slack(worst.p), simulated: false,
    };
  }
  if ((!location || !location.inside) && simulateOnSite) {
    const jitter = () => (Math.random() - 0.5) * 0.002;
    const p = { lat: f.lat + jitter(), lng: f.lng + jitter() };
    location = { ...p, accuracyM: 12, distanceM: Math.round(distanceM(p, f)), inside: true, simulated: true };
  }
  return location;
}

/** Latest odometer we know for a car: the newest photo reading. */
export function lastOdometer(s: DemoState, vin: string): number | null {
  let best: { at: string; km: number } | null = null;
  const consider = (r: PhotoCheck | undefined) => {
    const km = r?.odometer?.readKm;
    if (r && km != null && (!best || r.freshness.receivedAt > best.at)) best = { at: r.freshness.receivedAt, km };
  };
  for (const ci of s.checkIns) { const r = ci.results[vin]; if (r && !("skipped" in r)) consider(r); }
  for (const v of s.spotChecks) { const r = v.results[vin]; if (r?.status === "found") consider(r.photo); }
  return (best as { km: number } | null)?.km ?? null;
}

const VERIFIERS: Record<string, string[]> = {
  Tampere: ["Aino V.", "Lauri K."], Vantaa: ["Sanna M.", "Ville P."], Oulu: ["Eero T."], Lappeenranta: ["Helmi R."],
  Helsinki: ["Oona L.", "Matias S."], Espoo: ["Iida H."], Turku: ["Kalle N."], Jyväskylä: ["Emma J."],
};
const pickVerifier = (city: string) => { const l = VERIFIERS[city] ?? ["Local verifier"]; return l[Math.floor(Math.random() * l.length)]; };

export type { Severity, AlertSource };
