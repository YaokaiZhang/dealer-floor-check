/**
 * The domain engine: demo state, seeded from data/seed.json, and every rule that changes it.
 * Isomorphic and framework-free. The server (src/server/db.ts) is the only place that runs the
 * mutations; browsers receive the resulting state and send actions by name over /api/actions.
 */
import seed from "../../data/seed.json";
import type {
  Alert, AlertSource, Car, CheckIn, CheckInWindow, Dealer, DemoState, Geofence, PhotoCheck, Severity, ShotKind, SpotCheck, Tier, VisitCarResult,
} from "./types";
import { CLEAN_STREAK_TO_STEP_UP, TIER_ORDER, TIERS } from "@/config/tiers";
import { visitFee } from "./costModel";
import { drawRandom } from "./sampling";
import { samplingFor } from "./risk";
import { distanceM, formatDistance } from "./geo";
import { eur } from "./format";

export const VERSION = 7;
const HOUR = 3600_000;

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
  type SeedConnected = { lat: number; lng: number; odometerKm: number; lastSeenHoursAgo: number };
  const s = seed as unknown as {
    dealers: (Omit<Dealer, "cleanStreak" | "tierHistory">)[];
    cars: Car[];
    feeds: { connected: Record<string, SeedConnected>; marketplace: DemoState["feeds"]["marketplace"]; registry: DemoState["feeds"]["registry"] };
    demo: DemoState["demo"];
  };
  const connected: DemoState["feeds"]["connected"] = {};
  for (const [vin, f] of Object.entries(s.feeds.connected)) {
    connected[vin] = { lat: f.lat, lng: f.lng, odometerKm: f.odometerKm, lastSeen: new Date(now - f.lastSeenHoursAgo * HOUR).toISOString() };
  }
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
    feeds: { connected, marketplace: structuredClone(s.feeds.marketplace), registry: structuredClone(s.feeds.registry) },
    alerts: [],
    checkIns: [],
    spotChecks: [],
    photoHashes: [],
    demo: s.demo,
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
  log(s, `${d.name} → ${tier} tier: ${reason}`);
}

/** One unresolved high-severity alert moves the dealer to Review (more checks, no automatic penalties). */
function applyReviewRule(s: Store, d: Dealer) {
  const openHigh = s.alerts.some((a) => a.dealerId === d.id && a.severity === "high" && (a.status === "open" || a.status === "investigating"));
  if (openHigh && d.tier !== "Review") {
    d.tierBeforeReview = d.tier;
    setTier(s, d, "Review", "Unresolved high-severity alert, pending bank review");
  }
}

function createCheckIn(s: Store, dealerId: string, reason: CheckIn["reason"], targetVin?: string): CheckIn {
  const ci: CheckIn = { id: uid("ci"), dealerId, createdAt: new Date().toISOString(), reason, targetVin, status: "requested", sampledVins: [], results: {} };
  s.checkIns.unshift(ci);
  return ci;
}

function raiseAlert(s: Store, a: Omit<Alert, "id" | "createdAt" | "status" | "step">): Alert {
  const alert: Alert = { ...a, id: uid("al"), createdAt: new Date().toISOString(), status: "open", step: "signal" };
  s.alerts.unshift(alert);
  const d = dealerOf(s, a.dealerId);
  log(s, `${a.severity.toUpperCase()} alert · ${d.name}: ${a.message}`);
  // Ladder step 1: a friendly, targeted check-in for that one VIN.
  if (a.severity !== "low" && a.source !== "spot_check") {
    const ci = createCheckIn(s, a.dealerId, "targeted", a.vin);
    alert.step = "targeted_check_in";
    alert.targetedCheckInId = ci.id;
    log(s, `Targeted check-in sent to ${d.name} for ${a.vin}`);
  }
  // High severity: the next random spot check moves to today, with this car added.
  if (a.severity === "high" && a.source !== "spot_check") bringVisitForward(s, alert);
  applyReviewRule(s, d);
  return alert;
}

// ---------------------------------------------------------------- spot checks
const openVisit = (s: Store, dealerId: string) => s.spotChecks.find((v) => v.dealerId === dealerId && v.verifier.status !== "reported");

/** n random in-stock cars (connected ones included) plus any must-include cars, shuffled so none stands out. */
function drawVisitCars(s: Store, dealerId: string, n: number, mustInclude: string[] = []): string[] {
  const stock = s.cars.filter((c) => c.dealerId === dealerId && c.status === "in_stock" && !mustInclude.includes(c.vin));
  const vins = [...drawRandom(stock, n).map((c) => c.vin), ...mustInclude];
  return drawRandom(vins, vins.length);
}

function createSpotCheck(s: Store, dealerId: string, reason: SpotCheck["reason"], alert?: Alert): SpotCheck {
  const d = dealerOf(s, dealerId);
  const vins = drawVisitCars(s, dealerId, TIERS[d.tier].visit.cars, alert ? [alert.vin] : []);
  const now = new Date().toISOString();
  const v: SpotCheck = {
    id: uid("sc"), dealerId, createdAt: now, reason, alertIds: alert ? [alert.id] : [], sampledVins: vins, results: {},
    verifier: { dispatchedAt: now, name: pickVerifier(d.city), status: "offered", visitCode: `AV-${Math.floor(1000 + Math.random() * 9000)}`, fee: visitFee(vins.length) },
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
    if (s.alerts.some((a) => a.vin === vin && (a.status === "open" || a.status === "investigating"))) continue;
    const r = v.results[vin];
    const missing = !r || r.status === "missing";
    const a = raiseAlert(s, {
      dealerId: d.id, vin, source: "spot_check", severity: missing ? "high" : "medium",
      message: missing ? `Car not on the lot at a spot check${r?.status === "missing" && r.reason ? ` (${r.reason.toLowerCase()})` : ""}` : "Car at a spot check could not be confirmed",
      evidence: [...feedEvidence(s, vin), { label: "Spot check", value: describeVisitCar(r, v.verifier.simulated) }],
    });
    a.step = "visit";
    a.spotCheckId = v.id;
  }
  log(s, `Spot check at ${d.name}: ${v.sampledVins.length - bad.length}/${v.sampledVins.length} cars confirmed${bad.length ? " ✗" : " ✓"}`);
}

function feedEvidence(s: Store, vin: string): { label: string; value: string }[] {
  const car = carOf(s, vin);
  const d = dealerOf(s, car.dealerId);
  const ev: { label: string; value: string }[] = [
    { label: "Car", value: carLabel(car) },
    { label: "Open loan", value: `${eur(car.loanAmount)} since ${car.loanOpenedAt}` },
  ];
  const cc = s.feeds.connected[vin];
  if (cc) {
    const dist = distanceM(cc, d.geofence);
    ev.push({ label: "Connected car", value: `${cc.lat.toFixed(4)}, ${cc.lng.toFixed(4)} · ${formatDistance(dist)} from ${d.name} · ${cc.odometerKm.toLocaleString("en")} km` });
  }
  const m = s.feeds.marketplace[vin];
  if (m?.listed) ev.push({ label: "Marketplace", value: `${m.listingTitle ?? carLabel(car)}${m.price ? ` · ${eur(m.price)}` : ""} · ${m.status.toUpperCase()}` });
  const r = s.feeds.registry[vin];
  if (r) ev.push({ label: "Registry", value: `${r.pending ? "PENDING owner change → " : "Owner: "}${r.owner} · ${r.lastOwnerChange}` });
  return ev;
}

// ---------------------------------------------------------------- actions
export const ops = {
  setFlag(s: Store, k: keyof DemoFlags, v: boolean) {
    if (!(k in s.flags) || typeof v !== "boolean") throw new ActionError("Unknown flag");
    s.flags[k] = v;
  },

  /** Random check-in request. In production the risk engine picks the moment; here the demo panel does. */
  sendCheckIn(s: Store, dealerId: string) {
    createCheckIn(s, dealerId, "random");
    log(s, `Random check-in request sent to ${dealerOf(s, dealerId).name}`);
  },

  scheduleCheckIn(s: Store, id: string, window: CheckInWindow) {
    const ci = checkInOf(s, id);
    if (ci.status !== "requested" && ci.status !== "scheduled") throw new ActionError("Check-in already started");
    if (!window || typeof window.label !== "string" || Number.isNaN(Date.parse(window.start)) || Number.isNaN(Date.parse(window.end))) throw new ActionError("Invalid window");
    window = { id: String(window.id), label: window.label.slice(0, 80), start: window.start, end: window.end };
    ci.window = window;
    ci.status = "scheduled";
    log(s, `${dealerOf(s, ci.dealerId).name} picked a check-in window: ${window.label}`);
  },

  /** VINs are drawn only now, so the dealer can't prepare specific cars. */
  startCheckIn(s: Store, id: string) {
    const ci = checkInOf(s, id);
    if (ci.status === "in_progress") return;
    if (ci.status === "completed") throw new ActionError("Check-in already completed");
    const d = dealerOf(s, ci.dealerId);
    if (ci.reason === "targeted" && ci.targetVin) {
      ci.sampledVins = [ci.targetVin];
    } else {
      const { explanation, pool } = samplingFor(s, d);
      ci.sampling = explanation;
      ci.sampledVins = drawRandom(pool, explanation.n).map((c) => c.vin);
    }
    ci.status = "in_progress";
    ci.startedAt = new Date().toISOString();
    log(s, `${d.name} started a check-in: ${ci.sampledVins.length} car${ci.sampledVins.length === 1 ? "" : "s"} drawn`);
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

    d.history.push({
      id: uid("h"), date: today(), kind: "check_in",
      outcome: ci.outcome === "clean" ? "clean" : unverified.every((v) => { const r = ci.results[v]; return r && "skipped" in r; }) ? "skipped" : "failed",
      note: `${verified.length} of ${ci.sampledVins.length} car${ci.sampledVins.length === 1 ? "" : "s"} verified${ci.reason === "targeted" ? " (targeted)" : ""}`,
    });
    log(s, `${d.name} completed a check-in: ${verified.length}/${ci.sampledVins.length} verified`);

    // Targeted check-in answers its alert: verified → evidence conflicts, still needs a human look.
    if (ci.reason === "targeted") {
      const alert = s.alerts.find((a) => a.targetedCheckInId === ci.id);
      if (alert) alert.evidence.push({ label: "Targeted check-in", value: verified.length ? "Dealer photographed the VIN plate on site ✓" : "Car could not be verified by the dealer" });
    }

    if (ci.outcome === "clean") {
      d.cleanStreak += 1;
      if (d.cleanStreak >= CLEAN_STREAK_TO_STEP_UP && d.tier !== "Review" && d.tier !== "Gold") {
        setTier(s, d, TIER_ORDER[TIER_ORDER.indexOf(d.tier) + 1], `${CLEAN_STREAK_TO_STEP_UP} clean check-ins in a row`);
      }
    } else {
      d.cleanStreak = 0;
      for (const vin of unverified) {
        if (s.alerts.some((a) => a.vin === vin && a.status === "open")) continue;
        const r = ci.results[vin];
        const reason = !r || "skipped" in r ? "skipped at check-in"
          : r.vinMatch === "mismatch" || r.vinMatch === "unreadable" ? `VIN not confirmed (read: ${r.readVin ?? "none"})`
          : r.reuse.duplicate ? "photo matches an earlier check-in photo"
          : !r.location?.inside ? "photo taken outside the dealer lot" : "photo outside the chosen window";
        raiseAlert(s, { dealerId: d.id, vin, source: "check_in", severity: "low", message: `Car not verified: ${reason}`, evidence: feedEvidence(s, vin) });
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
    // Demo scenario: the same car also shows up far away on connected-car data and the registry has a pending change.
    if (car.demoScenario === "sold_out_of_trust") {
      const cc = s.feeds.connected[vin];
      if (cc) {
        cc.prevOdometerKm = cc.odometerKm;
        Object.assign(cc, { ...s.demo.soldCarAwayPosition, odometerKm: cc.odometerKm + 214, lastSeen: new Date().toISOString(), outsideSince: new Date(Date.now() - 50 * HOUR).toISOString() });
      }
      s.feeds.registry[vin] = { owner: "Private person, Jämsä", lastOwnerChange: today(), pending: true };
    }
    const cc = s.feeds.connected[vin];
    const corroborated = (cc && distanceM(cc, d.geofence) > d.geofence.radiusM) || s.feeds.registry[vin]?.pending;
    raiseAlert(s, {
      dealerId: d.id, vin, source: "marketplace",
      severity: corroborated ? "high" : "medium",
      message: `Listing marked ${status.toUpperCase()} while the loan is still open${corroborated ? ", corroborated by other signals" : ""}`,
      evidence: feedEvidence(s, vin),
    });
  },

  registryOwnerChange(s: Store, vin: string) {
    const car = carOf(s, vin);
    s.feeds.registry[vin] = { owner: "Private person", lastOwnerChange: today(), pending: false };
    raiseAlert(s, {
      dealerId: car.dealerId, vin, source: "registry", severity: "high",
      message: "Registry owner change on a car with an open loan",
      evidence: feedEvidence(s, vin),
    });
  },

  connectedLeavesGeofence(s: Store, vin: string) {
    const car = carOf(s, vin);
    const d = dealerOf(s, car.dealerId);
    const cc = s.feeds.connected[vin];
    if (!cc) return;
    // ~60 km away, outside for more than 48 h.
    Object.assign(cc, { lat: d.geofence.lat + 0.45, lng: d.geofence.lng + 0.35, lastSeen: new Date().toISOString(), outsideSince: new Date(Date.now() - 52 * HOUR).toISOString() });
    raiseAlert(s, {
      dealerId: d.id, vin, source: "connected_car", severity: "medium",
      message: `Car outside the dealer geofence for 52 h (${formatDistance(distanceM(cc, d.geofence))} away)`,
      evidence: feedEvidence(s, vin),
    });
  },

  connectedOdometerJump(s: Store, vin: string) {
    const car = carOf(s, vin);
    const cc = s.feeds.connected[vin];
    if (!cc) return;
    cc.prevOdometerKm = cc.odometerKm;
    cc.odometerKm += 742;
    cc.lastSeen = new Date().toISOString();
    raiseAlert(s, {
      dealerId: car.dealerId, vin, source: "connected_car", severity: "medium",
      message: "Odometer jumped 742 km since the last reading",
      evidence: feedEvidence(s, vin),
    });
  },

  // ----- bank actions (escalation ladder + human review)

  /** Bank officer: bring the next random spot check forward for a medium or low alert. */
  bringVisitForward(s: Store, alertId: string) {
    const a = alertOf(s, alertId);
    bringVisitForward(s, a);
  },

  /** Random, unannounced spot check. In production the schedule draws these; here the demo panel does. */
  sendSpotCheck(s: Store, dealerId: string) {
    if (openVisit(s, dealerId)) return;
    const v = createSpotCheck(s, dealerId, "random");
    log(s, `Random spot check posted for ${dealerOf(s, dealerId).name} (${v.sampledVins.length} cars, ${eur(v.verifier.fee)})`);
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
      // Demo: the sold-out-of-trust car, and cars with a registry owner change, are not on the lot.
      const gone = carOf(s, vin).demoScenario === "sold_out_of_trust" || s.alerts.some((a) => a.vin === vin && a.source === "registry" && v.alertIds.includes(a.id));
      v.results[vin] = gone ? { status: "missing", reason: "Staff said it was out on a test drive; no test-drive record" } : { status: "found" };
    }
    finishSpotCheck(s, v);
  },

  escalateToAuditor(s: Store, alertId: string) {
    const a = alertOf(s, alertId);
    a.step = "auditor";
    a.status = "investigating";
    log(s, `Account manager + auditor assigned to ${dealerOf(s, a.dealerId).name} (${a.vin})`);
  },

  /** Human decision at the bank. Only this changes loan status or lifts Review. */
  resolveAlert(s: Store, alertId: string, outcome: "resolved_ok" | "confirmed_fraud") {
    const a = alertOf(s, alertId);
    const d = dealerOf(s, a.dealerId);
    a.status = outcome;
    d.history.push({ id: uid("h"), date: today(), kind: "alert", outcome: outcome === "resolved_ok" ? "resolved" : "failed", note: `${a.message} (${outcome === "resolved_ok" ? "cleared by bank" : "confirmed sold out of trust"})` });
    if (outcome === "confirmed_fraud") {
      carOf(s, a.vin).status = "sold_unpaid_suspect";
      log(s, `Bank confirmed sold out of trust: ${a.vin} at ${d.name}`);
    } else {
      log(s, `Bank cleared alert for ${a.vin} at ${d.name}`);
      const stillHigh = s.alerts.some((x) => x.dealerId === d.id && x.severity === "high" && (x.status === "open" || x.status === "investigating"));
      if (!stillHigh && d.tier === "Review" && d.tierBeforeReview) {
        setTier(s, d, d.tierBeforeReview, "Alert cleared by bank review");
        d.tierBeforeReview = undefined;
      }
    }
  },

  /** Manual tier override by a bank officer. */
  overrideTier(s: Store, dealerId: string, tier: Tier) {
    if (!TIER_ORDER.includes(tier)) throw new ActionError("Unknown tier");
    setTier(s, dealerOf(s, dealerId), tier, "Set manually by account manager");
  },

  /**
   * Server only, every few seconds. Stands in for the production risk engine's schedule:
   *  - with `autoSchedule`, random check-ins and spot checks arrive at each tier's yearly rate on a
   *    compressed clock (one demo year = DEMO_YEAR_MS);
   *  - with `autoVerifier`, open spot checks get a simulated report a few seconds after dispatch.
   */
  tick(s: Store, elapsedMs: number, now = Date.now()) {
    if (s.flags.autoVerifier) {
      for (const v of s.spotChecks) {
        if (v.verifier.status !== "reported" && now - Date.parse(v.verifier.dispatchedAt) >= AUTO_REPORT_MS) ops.verifierReport(s, v.id);
      }
    }
    if (!s.flags.autoSchedule) return;
    const share = Math.min(1, elapsedMs / DEMO_YEAR_MS);
    for (const d of s.dealers) {
      const t = TIERS[d.tier];
      const openCheckIn = s.checkIns.some((c) => c.dealerId === d.id && c.reason === "random" && c.status !== "completed");
      if (!openCheckIn && Math.random() < t.checkInsPerYear * share) {
        createCheckIn(s, d.id, "random");
        log(s, `Schedule: random check-in request sent to ${d.name}`);
      }
      if (!openVisit(s, d.id) && s.cars.some((c) => c.dealerId === d.id && c.status === "in_stock") && Math.random() < t.visit.perYear * share) {
        const v = createSpotCheck(s, d.id, "random");
        log(s, `Schedule: random spot check posted for ${d.name} (${v.sampledVins.length} cars, ${eur(v.verifier.fee)})`);
      }
    }
  },
};

/** Actions a browser may send. The rest are written by the server itself. */
export const CLIENT_OPS = [
  "setFlag", "sendCheckIn", "scheduleCheckIn", "startCheckIn", "skipCar", "completeCheckIn",
  "marketplaceSold", "registryOwnerChange", "connectedLeavesGeofence", "connectedOdometerJump",
  "bringVisitForward", "sendSpotCheck", "verifierAccept", "verifierArrive", "verifierCar", "verifierSubmit",
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
 * Is the phone on the lot? Every fix must be inside the geofence (with up to 150 m GPS slack); the
 * farthest one is reported. With `simulateOnSite` (stage demo far from the dealer) a missing or
 * outside fix is replaced by a point on the lot, labelled simulated.
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

/** Latest odometer we know for a car: connected-car feed, else the newest photo reading. */
export function lastOdometer(s: DemoState, vin: string): number | null {
  const feed = s.feeds.connected[vin]?.odometerKm;
  if (feed !== undefined) return feed;
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
};
const pickVerifier = (city: string) => { const l = VERIFIERS[city] ?? ["Local verifier"]; return l[Math.floor(Math.random() * l.length)]; };

export type { Severity, AlertSource };
