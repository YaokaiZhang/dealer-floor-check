"use client";
import type { Store } from "@/lib/store";
import { actions } from "@/lib/store";
import type { Alert, Car, CheckIn, ConnectedFeed, Dealer, EscalationStep, SpotCheck } from "@/lib/types";
import { distanceM, formatDistance } from "@/lib/geo";
import { dateFi, eur, timeAgo, timeFi } from "@/lib/format";
import { ASSUMPTIONS } from "@/config/assumptions";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { TierBadge } from "@/components/ui/TierBadge";
import { visitFee } from "@/lib/costModel";
import { H, SEV_BAR, STEP_ORDER, SeverityTag, SourceTag, StatusTag, isOpen, useNow, visitFoundCar } from "./shared";

const LADDER: { step: EscalationStep; title: string; who: string; cost: string }[] = [
  { step: "signal", title: "Signal", who: "Automatic", cost: "€0" },
  { step: "targeted_check_in", title: "Check-in", who: "Dealer photo", cost: `€${ASSUMPTIONS.checkInHandlingCost}` },
  { step: "visit", title: "Spot check", who: "Next random visit, today", cost: `€${visitFee(ASSUMPTIONS.avgCarsPerVisit)}` },
  { step: "auditor", title: "Auditor", who: "Last resort", cost: `€${ASSUMPTIONS.auditorVisitCost}` },
];

export function AlertDetail({ s, alert, onDealer }: { s: Store; alert: Alert; onDealer: (id: string) => void }) {
  const now = useNow(1000);
  const d = s.dealers.find((x) => x.id === alert.dealerId)!;
  const car = s.cars.find((c) => c.vin === alert.vin)!;
  const cc = car.connected ? s.feeds.connected[alert.vin] : undefined;
  const ci = alert.targetedCheckInId ? s.checkIns.find((c) => c.id === alert.targetedCheckInId) : undefined;
  const open = isOpen(alert);
  const visit = alert.spotCheckId ? s.spotChecks.find((v) => v.id === alert.spotCheckId) : undefined;
  const stepIdx = STEP_ORDER.indexOf(alert.step);

  return (
    <div>
      <div className={`h-2 ${SEV_BAR[alert.severity]}`} aria-hidden />
      <div className="space-y-8 p-4 md:p-6">
        <header>
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityTag severity={alert.severity} />
            <SourceTag source={alert.source} />
            <StatusTag alert={alert} visit={visit} />
            <span className="ml-auto text-xs tabular-nums text-ash-700">{timeAgo(alert.createdAt, now)}, {timeFi(alert.createdAt)}</span>
          </div>
          <h2 className="mt-4 display-lg">{alert.message}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <button type="button" onClick={() => onDealer(d.id)} className="inline-flex min-h-9 items-center gap-2 font-semibold underline decoration-brand decoration-2 underline-offset-4 hover:decoration-ink">
              {d.name}, {d.city}
            </button>
            <TierBadge tier={d.tier} />
            <span className="text-sm">{car.year} {car.make} {car.model}, <span className="font-mono text-xs">{car.plate}</span>, <span className="font-mono text-xs">{car.vin}</span></span>
          </div>
        </header>

        <section className="border border-ink bg-mist p-4" aria-labelledby="next-step-h">
          <div className="flex items-center justify-between gap-2">
            <h3 id="next-step-h" className="text-sm text-ash-700">Next step</h3>
            <Tag tone="outline">Officer decides</Tag>
          </div>
          <p className="mt-1 text-lg font-semibold leading-snug">{recommend(alert, ci, visit)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="brand" disabled={!open || !!visit || alert.step === "auditor"} onClick={() => actions.bringVisitForward(alert.id)}>
              Bring spot check forward
            </Button>
            <Button variant="secondary" disabled={!open || alert.step === "auditor"} onClick={() => actions.escalateToAuditor(alert.id)}>
              Escalate to auditor
            </Button>
            <Button variant="secondary" disabled={!open} onClick={() => actions.resolveAlert(alert.id, "resolved_ok")}>
              Clear (resolved)
            </Button>
            <Button variant="danger" disabled={!open} onClick={() => actions.resolveAlert(alert.id, "confirmed_fraud")}>
              Confirm sold out of trust
            </Button>
          </div>
        </section>

        <Ladder stepIdx={stepIdx} alert={alert} />

        {visit && <SpotCheckCard s={s} alert={alert} visit={visit} now={now} />}

        <TargetedCheckIn ci={ci} vin={alert.vin} severity={alert.severity} />

        {cc && <ConnectedCar cc={cc} d={d} car={car} />}

        <div>
          <H>Evidence</H>
          <dl className="mt-3 divide-y divide-ash-300 border-y border-ink">
            {alert.evidence.map((e, i) => (
              <div key={i} className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="tag-text text-ash-700 sm:pt-0.5">{e.label}</dt>
                <dd className="text-sm">{e.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

function recommend(a: Alert, ci?: CheckIn, v?: SpotCheck): string {
  if (a.status === "resolved_ok") return "Cleared.";
  if (a.status === "confirmed_fraud") return "Confirmed. Hand over to recovery.";
  if (a.step === "auditor") return "Auditor assigned. Decide after the visit.";
  if (v?.verifier.status === "offered") return "Spot check brought forward. Waiting for a verifier.";
  if (v?.verifier.status === "en_route") return `${v.verifier.name} en route.`;
  if (v?.verifier.status === "on_site") return `${v.verifier.name} on the lot.`;
  if (v) return visitFoundCar(v, a.vin) ? "Car found. Clear the alert." : "Car not found. Escalate or confirm.";
  if (ci && ci.status !== "completed") return "Wait for the dealer's check-in.";
  if (ci?.status === "completed") return ci.outcome === "clean" ? "Photographed on site. Clear it." : "Check-in failed. Bring the spot check forward.";
  return "Low severity. Keep watching.";
}

function Ladder({ stepIdx, alert }: { stepIdx: number; alert: Alert }) {
  const closed = !isOpen(alert);
  return (
    <div>
      <H note="cheapest check first">Escalation</H>
      <ol className="mt-3 grid border border-ink sm:grid-cols-4">
        {LADDER.map((l, i) => {
          const current = i === stepIdx && !closed;
          const done = i < stepIdx || (closed && i <= stepIdx);
          return (
            <li
              key={l.step}
              aria-current={current ? "step" : undefined}
              className={`relative flex flex-col gap-1 p-3 ${i > 0 ? "border-t border-ink sm:border-t-0 sm:border-l" : ""} ${current ? "bg-brand" : done ? "bg-paper" : "bg-mist text-ash-500"}`}
            >
              <span className="flex items-center justify-between">
                <span className={`flex size-6 items-center justify-center border tag-text ${current ? "border-ink bg-ink text-paper" : done ? "border-ink bg-lime text-ink" : "border-ash-300"}`}>
                  {done ? "✓" : i + 1}
                </span>
                <span className="figure text-xl">{l.cost}</span>
              </span>
              <span className="mt-1 font-semibold leading-tight">{l.title}</span>
              <span className="text-xs leading-snug">{l.who}</span>
              {current && <Tag tone="ink" className="mt-1">Now</Tag>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const V_STEPS = [
  { key: "dispatchedAt", label: "Posted" },
  { key: "acceptedAt", label: "Accepted" },
  { key: "arrivedAt", label: "On site" },
  { key: "reportedAt", label: "Report" },
] as const;

function SpotCheckCard({ s, alert, visit, now }: { s: Store; alert: Alert; visit: SpotCheck; now: number }) {
  const v = visit.verifier;
  const reported = v.status === "reported";
  const found = visitFoundCar(visit, alert.vin);
  const r = visit.results[alert.vin];
  const photo = r?.status === "found" ? r.photo : undefined;
  const others = visit.sampledVins.filter((x) => x !== alert.vin);
  const othersOk = others.filter((x) => visitFoundCar(visit, x)).length;
  const secs = Math.max(0, Math.round((now - Date.parse(v.dispatchedAt)) / 1000));
  return (
    <div className={`border border-ink ${reported ? (found ? "bg-lime" : "bg-high-soft") : "bg-paper"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink px-4 py-3">
        <H note={`${visit.sampledVins.length} cars, ${eur(v.fee)}`}>Spot check</H>
        <span className="text-xs text-ash-700">{v.name}, <span className="font-mono">{v.visitCode}</span></span>
      </div>
      <ol className="grid grid-cols-4 border-b border-ink">
        {V_STEPS.map((st, i) => {
          const at = v[st.key];
          return (
            <li key={st.key} className={`min-w-0 px-2 py-2 sm:px-3 ${i > 0 ? "border-l border-ink" : ""} ${at ? "" : "text-ash-500"}`}>
              <span className="block tag-text">{at ? "✓ " : ""}{st.label}</span>
              <span className="block font-mono text-xs">{at ? timeFi(at) : "—"}</span>
            </li>
          );
        })}
      </ol>
      <div className="p-4">
        {!reported ? (
          <>
            <p className="flex items-center gap-2 display-md">
              <span className="inline-block size-2.5 animate-pulse-dot bg-brand-deep" aria-hidden />
              {v.status === "offered" ? "Waiting for a verifier to accept" : v.status === "en_route" ? `${v.name} en route` : `${v.name} on the lot`}
            </p>
            <p className="mt-1 text-sm text-ash-700">Looks like any random visit: this car plus {others.length} random.</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 tag-text text-ash-700">
              <span>{secs < 60 ? `${secs} s` : `${Math.floor(secs / 60)} min`} ago</span>
              <a className="py-2 underline underline-offset-4 hover:text-ink" href="/verifier" target="_blank" rel="noreferrer">Verifier app ↗</a>
              <button type="button" onClick={() => actions.verifierReport(visit.id)} className="py-2 underline underline-offset-4 hover:text-ink">Simulate report</button>
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="display-md">{found ? "Car found ✓" : r?.status === "missing" ? "Car not on the lot" : "Car not confirmed"}</p>
              {r?.status === "missing" && r.reason && <p className="mt-1 text-sm">{r.reason}.</p>}
              {v.note && <p className="mt-1 text-sm">Note: {v.note}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {v.arrival && (
                  <>
                    <dt className="tag-text text-ash-700">Arrival location</dt>
                    <dd className="font-mono">{formatDistance(v.arrival.distanceM)} from lot{v.arrival.simulated ? " (simulated)" : ""}</dd>
                  </>
                )}
                {photo && (
                  <>
                    <dt className="tag-text text-ash-700">VIN read</dt>
                    <dd className="font-mono">{photo.readVin ?? "unreadable"} · {photo.vinMatch}</dd>
                    {photo.plate && (
                      <>
                        <dt className="tag-text text-ash-700">Plate read</dt>
                        <dd className="font-mono">{photo.plate.read ?? "unreadable"} · {photo.plate.match ? "match" : "mismatch"}</dd>
                      </>
                    )}
                    {photo.odometer && (
                      <>
                        <dt className="tag-text text-ash-700">Odometer</dt>
                        <dd className="font-mono">{photo.odometer.readKm != null ? `${photo.odometer.readKm.toLocaleString("en")} km` : "unreadable"}{photo.odometer.plausible ? "" : " · implausible"}</dd>
                      </>
                    )}
                    <dt className="tag-text text-ash-700">Photo reuse</dt>
                    <dd className="font-mono">{photo.reuse.duplicate ? "DUPLICATE" : `none (nearest ${photo.reuse.nearestDistance} bits)`}</dd>
                  </>
                )}
                <dt className="tag-text text-ash-700">Other cars</dt>
                <dd className="font-mono">{othersOk} of {others.length} confirmed</dd>
                {v.simulated && (
                  <>
                    <dt className="tag-text text-ash-700">Source</dt>
                    <dd className="font-mono">simulated report</dd>
                  </>
                )}
              </dl>
            </div>
            {photo?.thumbnails?.car && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.thumbnails.car} alt={`Verifier photo of ${s.cars.find((c) => c.vin === alert.vin)?.plate ?? alert.vin}`} className="w-40 border border-ink object-cover" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const CI_STATUS: Record<CheckIn["status"], string> = {
  requested: "Waiting for the dealer",
  scheduled: "Booked",
  in_progress: "In progress",
  completed: "Completed",
};

function TargetedCheckIn({ ci, vin, severity }: { ci?: CheckIn; vin: string; severity: string }) {
  if (!ci) {
    return (
      <div className="border border-ash-300 p-4 text-sm text-ash-700">
        <H>Targeted check-in</H>
        <p className="mt-1">{severity === "low" ? "Not sent (low)." : "None."}</p>
      </div>
    );
  }
  const r = ci.results[vin];
  const photo = r && !("skipped" in r) ? r : null;
  return (
    <div className="border border-ink p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <H>Targeted check-in</H>
        <Tag tone={ci.status === "completed" ? (ci.outcome === "clean" ? "lime" : "high") : "muted"}>{ci.status === "completed" ? ci.outcome : ci.status.replace("_", " ")}</Tag>
      </div>
      <p className="mt-2 font-semibold">{CI_STATUS[ci.status]}{ci.window ? `: ${ci.window.label}` : ""}</p>
      {r && "skipped" in r && <p className="mt-2 text-sm">Dealer skipped this car.</p>}
      {photo && (
        <p className="mt-2 text-sm">
          VIN {photo.vinMatch.replace("_", " ")} ({Math.round(photo.confidence * 100)}%){photo.plate ? ` · plate ${photo.plate.match ? "✓" : "✗"}` : ""}{photo.odometer ? ` · odometer ${photo.odometer.plausible ? "✓" : "✗"}` : ""} · {photo.location ? (photo.location.inside ? "on the lot" : `${formatDistance(photo.location.distanceM)} away`) : "no location"} · {photo.verified ? "verified ✓" : "not verified"}
        </p>
      )}
    </div>
  );
}

function ConnectedCar({ cc, d, car }: { cc: ConnectedFeed; d: Dealer; car: Car }) {
  const dist = distanceM(cc, d.geofence);
  const inside = dist <= d.geofence.radiusM;
  return (
    <div>
      <H>Connected car</H>
      <div className="mt-3 grid gap-4 border border-ink p-4 sm:grid-cols-[1fr_15rem]">
        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="tag-text text-ash-700">Position</dt>
          <dd className="font-mono">{cc.lat.toFixed(4)}, {cc.lng.toFixed(4)}</dd>
          <dt className="tag-text text-ash-700">From lot</dt>
          <dd className="font-semibold">{inside ? "Inside geofence" : `${formatDistance(dist)} away`}</dd>
          <dt className="tag-text text-ash-700">Last seen</dt>
          <dd>{timeAgo(cc.lastSeen)}</dd>
          {cc.outsideSince && (
            <>
              <dt className="tag-text text-ash-700">Outside since</dt>
              <dd>{dateFi(cc.outsideSince)} {timeFi(cc.outsideSince)}</dd>
            </>
          )}
          <dt className="tag-text text-ash-700">Odometer</dt>
          <dd className="tabular-nums">
            {cc.prevOdometerKm ? `${cc.prevOdometerKm.toLocaleString("en")} → ` : ""}
            {cc.odometerKm.toLocaleString("en")} km
            {cc.prevOdometerKm ? <strong className="ml-1">(+{(cc.odometerKm - cc.prevOdometerKm).toLocaleString("en")})</strong> : null}
          </dd>
          <dt className="tag-text text-ash-700">Loan</dt>
          <dd>{eur(car.loanAmount)}</dd>
        </dl>
        <MiniMap cc={cc} d={d} dist={dist} />
      </div>
    </div>
  );
}

/** Schematic (not to scale): dealer geofence vs car dot along the true bearing. */
function MiniMap({ cc, d, dist }: { cc: ConnectedFeed; d: Dealer; dist: number }) {
  const W = 240, H = 150, R = 16;
  const dx = (cc.lng - d.geofence.lng) * Math.cos((d.geofence.lat * Math.PI) / 180);
  const dy = cc.lat - d.geofence.lat;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = -dy / len;
  const inside = dist <= d.geofence.radiusM;
  // Put the dealer opposite the bearing so the line uses the whole box.
  const cx = inside ? W / 2 : W / 2 - ux * 60, cy = inside ? H / 2 : H / 2 - uy * 35;
  // Inside: true scale within the circle. Outside: out to ~85% of the way to the box edge along the bearing.
  const edge = Math.min(ux > 0 ? (W - 14 - cx) / ux : ux < 0 ? (14 - cx) / ux : Infinity, uy > 0 ? (H - 14 - cy) / uy : uy < 0 ? (14 - cy) / uy : Infinity);
  const reach = inside ? (dist / d.geofence.radiusM) * R * 0.8 : Math.max(R + 30, edge * 0.9);
  const px = cx + ux * reach, py = cy + uy * reach;
  const mx = (cx + px) / 2, my = (cy + py) / 2;
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-ink bg-mist" role="img" aria-label={`Car ${inside ? "inside the dealer geofence" : `${formatDistance(dist)} from the dealer geofence`}`}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="#ececec" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        <circle cx={cx} cy={cy} r={R} fill="#e6e3ff" stroke="#000" strokeWidth="1" />
        <rect x={cx - 3} y={cy - 3} width="6" height="6" fill="#000" />
        <text x={cx} y={cy + R + 14} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="#4d4d4d">{d.name.toUpperCase()}</text>
        {!inside && <line x1={cx} y1={cy} x2={px} y2={py} stroke="#000" strokeWidth="1" strokeDasharray="3 3" />}
        <circle cx={px} cy={py} r="6" fill={inside ? "#c4ff0d" : "#ff4f3f"} stroke="#fff" strokeWidth="2" />
        <circle cx={px} cy={py} r="6" fill="none" stroke="#000" strokeWidth="1" />
        {!inside && (
          <g>
            <rect x={mx - 26} y={my - 9} width="52" height="16" fill="#000" />
            <text x={mx} y={my + 3} textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff">{formatDistance(dist)}</text>
          </g>
        )}
        <g transform={`translate(${W - 16},18)`}>
          <path d="M0 -9 L4 3 L0 0 L-4 3Z" fill="#000" />
          <text y="12" textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)">N</text>
        </g>
      </svg>
      <figcaption className="mt-1 tag-text text-ash-500">Not to scale</figcaption>
    </figure>
  );
}
