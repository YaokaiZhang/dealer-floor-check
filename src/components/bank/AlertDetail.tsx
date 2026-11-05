"use client";
import type { Store } from "@/lib/store";
import { actions } from "@/lib/store";
import type { Alert, Car, CheckIn, ConnectedFeed, Dealer, EscalationStep } from "@/lib/types";
import { distanceM, formatDistance } from "@/lib/geo";
import { dateFi, eur, timeAgo, timeFi } from "@/lib/format";
import { ASSUMPTIONS } from "@/config/assumptions";
import { Button } from "@/components/ui/Button";
import { SectionTag } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { TierBadge } from "@/components/ui/TierBadge";
import { SEV_BAR, STEP_ORDER, SeverityTag, SourceTag, StatusTag, isOpen, useNow } from "./shared";

const LADDER: { step: EscalationStep; title: string; who: string; cost: string }[] = [
  { step: "signal", title: "Signal", who: "Data feeds, automatic", cost: "€0" },
  { step: "targeted_check_in", title: "Targeted check-in", who: "Dealer photographs that one VIN", cost: `€${ASSUMPTIONS.checkInHandlingCost}` },
  { step: "gig_verifier", title: "Gig verifier", who: "Local verifier visits the lot", cost: `€${ASSUMPTIONS.gigCheckCost}` },
  { step: "auditor", title: "Auditor / account manager", who: "Only for confirmed problems", cost: `€${ASSUMPTIONS.auditorVisitCost}` },
];

export function AlertDetail({ s, alert, onDealer }: { s: Store; alert: Alert; onDealer: (id: string) => void }) {
  const now = useNow(1000);
  const d = s.dealers.find((x) => x.id === alert.dealerId)!;
  const car = s.cars.find((c) => c.vin === alert.vin)!;
  const cc = car.connected ? s.feeds.connected[alert.vin] : undefined;
  const ci = alert.targetedCheckInId ? s.checkIns.find((c) => c.id === alert.targetedCheckInId) : undefined;
  const open = isOpen(alert);
  const stepIdx = STEP_ORDER.indexOf(alert.step);

  return (
    <div>
      <div className={`h-2 ${SEV_BAR[alert.severity]}`} aria-hidden />
      <div className="space-y-8 p-4 md:p-6">
        <header>
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityTag severity={alert.severity} />
            <SourceTag source={alert.source} />
            <StatusTag alert={alert} />
            <span className="tag-text text-ash-700">{timeAgo(alert.createdAt, now)} · {timeFi(alert.createdAt)}</span>
          </div>
          <h2 className="mt-4 display-lg">{alert.message}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <button type="button" onClick={() => onDealer(d.id)} className="inline-flex items-center gap-2 font-semibold underline decoration-brand decoration-2 underline-offset-4 hover:decoration-ink">
              {d.name}, {d.city}
            </button>
            <TierBadge tier={d.tier} />
            <span className="font-mono text-xs">{car.year} {car.make} {car.model} · {car.plate} · {car.vin}</span>
          </div>
        </header>

        {/* Human review */}
        <div className="border border-ink bg-brand-soft p-4">
          <p className="tag-text">Human review</p>
          <p className="mt-1 text-sm">
            Signals only raise how closely we look (more check-ins, Review tier). Loan status and the dealer&apos;s terms change only after a bank officer clears or confirms the case here.
          </p>
        </div>

        <Ladder stepIdx={stepIdx} alert={alert} />

        <div className="border border-ink p-4">
          <SectionTag>Recommended next step</SectionTag>
          <p className="mt-2 font-semibold leading-snug">{recommend(alert, ci)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="brand" disabled={!open || !!alert.verifier || alert.step === "auditor"} onClick={() => actions.dispatchVerifier(alert.id)}>
              Dispatch verifier (€{ASSUMPTIONS.gigCheckCost})
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
          {!open && (
            <p className="mt-3 text-sm text-ash-700">
              Closed by bank review: {alert.status === "resolved_ok" ? "cleared, no action against the dealer." : "confirmed sold out of trust, loan flagged for recovery."}
            </p>
          )}
        </div>

        {alert.verifier && <VerifierCard alert={alert} now={now} />}

        <TargetedCheckIn ci={ci} vin={alert.vin} severity={alert.severity} />

        {cc && <ConnectedCar cc={cc} d={d} car={car} />}

        <div>
          <SectionTag>Evidence</SectionTag>
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

function recommend(a: Alert, ci?: CheckIn): string {
  if (a.status === "resolved_ok") return "Case closed. The dealer returns to their previous tier once no high alert is open.";
  if (a.status === "confirmed_fraud") return "Confirmed. Hand over to recovery and review the dealer's credit line with the account manager.";
  if (a.step === "auditor") return "Auditor and account manager assigned. Decide after their visit: clear, or confirm sold out of trust.";
  if (a.verifier?.status === "en_route") return `${a.verifier.name} is on the way. Report expected within minutes (seconds in this demo).`;
  if (a.verifier?.status === "reported")
    return a.verifier.found
      ? "Verifier found the car on the lot. Clear the alert to lift Review; no auditor needed."
      : "Verifier could not find the car. Escalate to an auditor / account manager, or confirm sold out of trust.";
  if (a.severity === "high")
    return `Several signals agree. Dispatch a gig verifier now (€${ASSUMPTIONS.gigCheckCost}) instead of sending an auditor (€${ASSUMPTIONS.auditorVisitCost}). The targeted check-in stays open in parallel.`;
  if (ci && ci.status !== "completed") return "Give the dealer time to answer the friendly targeted check-in. If it isn't done within a day, dispatch a gig verifier.";
  if (ci?.status === "completed") return ci.outcome === "clean" ? "Dealer photographed the car on site. Clear if the signal is explained." : "The car couldn't be verified at the check-in. Dispatch a gig verifier.";
  return "Low severity: keep watching. Clear it if the signal is explained.";
}

function Ladder({ stepIdx, alert }: { stepIdx: number; alert: Alert }) {
  const closed = !isOpen(alert);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <SectionTag>Escalation ladder</SectionTag>
        <span className="tag-text text-ash-700">Cheapest effective step first</span>
      </div>
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

function VerifierCard({ alert, now }: { alert: Alert; now: number }) {
  const v = alert.verifier!;
  const secs = Math.max(0, Math.round((now - Date.parse(v.dispatchedAt)) / 1000));
  return (
    <div className={`border border-ink p-4 ${v.status === "reported" ? (v.found ? "bg-lime" : "bg-high-soft") : "bg-paper"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTag className="!text-ink">Gig verifier · €{ASSUMPTIONS.gigCheckCost}</SectionTag>
        <span className="tag-text text-ash-700">Dispatched {timeFi(v.dispatchedAt)}</span>
      </div>
      {v.status === "en_route" ? (
        <div className="mt-2">
          <p className="flex items-center gap-2 display-md">
            <span className="inline-block size-2.5 animate-pulse-dot bg-brand-deep" aria-hidden /> {v.name} en route
          </p>
          <div className="mt-3 h-1.5 overflow-hidden bg-ash-100" aria-hidden>
            <div className="h-full bg-brand-deep transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (secs / 6) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-ash-700">Checking the VIN plate and odometer on the lot.</p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="display-md">{v.found ? "Car found ✓" : "Car not on the lot"}</p>
          <p className="mt-1 text-sm">{v.name}: {v.report}</p>
        </div>
      )}
    </div>
  );
}

const CI_STATUS: Record<CheckIn["status"], string> = {
  requested: "Sent to the dealer, waiting for them to pick a time",
  scheduled: "Dealer picked a time window",
  in_progress: "Dealer is doing the check-in now",
  completed: "Completed",
};

function TargetedCheckIn({ ci, vin, severity }: { ci?: CheckIn; vin: string; severity: string }) {
  if (!ci) {
    return (
      <div className="border border-ash-300 p-4 text-sm text-ash-700">
        <SectionTag>Targeted check-in</SectionTag>
        <p className="mt-1">{severity === "low" ? "Not sent for low-severity alerts." : "None linked."}</p>
      </div>
    );
  }
  const r = ci.results[vin];
  const photo = r && !("skipped" in r) ? r : null;
  return (
    <div className="border border-ink p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTag>Targeted check-in · step 1</SectionTag>
        <Tag tone={ci.status === "completed" ? (ci.outcome === "clean" ? "lime" : "high") : "muted"}>{ci.status === "completed" ? ci.outcome : ci.status.replace("_", " ")}</Tag>
      </div>
      <p className="mt-2 font-semibold">{CI_STATUS[ci.status]}{ci.window ? `: ${ci.window.label}` : ""}</p>
      <p className="mt-1 text-sm text-ash-700">
        Friendly request for this one car, sent {timeFi(ci.createdAt)}. The dealer sees a normal check-in, never the alert.
      </p>
      {r && "skipped" in r && <p className="mt-2 text-sm">Dealer skipped this car.</p>}
      {photo && (
        <p className="mt-2 text-sm">
          VIN {photo.vinMatch.replace("_", " ")} ({Math.round(photo.confidence * 100)}%) · {photo.location ? (photo.location.inside ? "on the lot" : `${formatDistance(photo.location.distanceM)} away`) : "no location"} · {photo.verified ? "verified ✓" : "not verified"}
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
      <SectionTag>Connected car</SectionTag>
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
        <text x={cx} y={cy + R + 13} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="#4d4d4d">{d.name.toUpperCase()}</text>
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
          <text y="12" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)">N</text>
        </g>
      </svg>
      <figcaption className="mt-1 tag-text text-ash-500">Schematic, not to scale</figcaption>
    </figure>
  );
}
