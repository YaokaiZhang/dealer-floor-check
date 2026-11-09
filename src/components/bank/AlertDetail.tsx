"use client";
import type { Store } from "@/lib/store";
import { actions } from "@/lib/store";
import type { Alert, CheckIn, Dealer, EscalationStep, PhotoCheck, SpotCheck } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import { dateFi, eur, timeAgo, timeFi } from "@/lib/format";
import { ASSUMPTIONS } from "@/config/assumptions";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { TierBadge } from "@/components/ui/TierBadge";
import { visitFee } from "@/lib/costModel";
import { Block, SEV_BAR, STEP_ORDER, SeverityTag, SourceTag, StatusTag, isOpen, useNow, visitFoundCar } from "./shared";

const LADDER: { step: EscalationStep; title: string; who: string; cost: string }[] = [
  { step: "signal", title: "Signal", who: "Automatic", cost: "€0" },
  { step: "targeted_check_in", title: "Self-check", who: "Dealer photo, one car", cost: `€${ASSUMPTIONS.checkInHandlingCost}` },
  { step: "visit", title: "Spot check", who: "Next random visit, today", cost: `€${visitFee(ASSUMPTIONS.avgCarsPerVisit)}` },
  { step: "auditor", title: "Full count", who: "Last resort, every car", cost: `€${ASSUMPTIONS.auditorVisitCost}/car` },
];

export function AlertDetail({ s, alert, onDealer }: { s: Store; alert: Alert; onDealer: (id: string) => void }) {
  const now = useNow(1000);
  const d = s.dealers.find((x) => x.id === alert.dealerId)!;
  const car = s.cars.find((c) => c.vin === alert.vin)!;
  const ci = alert.targetedCheckInId ? s.checkIns.find((c) => c.id === alert.targetedCheckInId) : undefined;
  const open = isOpen(alert);
  const visit = alert.spotCheckId ? s.spotChecks.find((v) => v.id === alert.spotCheckId) : undefined;
  const stepIdx = STEP_ORDER.indexOf(alert.step);

  return (
    <div>
      <div className={`h-2 ${SEV_BAR[alert.severity]}`} aria-hidden />
      <header className="px-4 pt-6 pb-8 md:px-8 md:pt-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityTag severity={alert.severity} />
          <SourceTag source={alert.source} />
          <StatusTag alert={alert} visit={visit} />
          <span className="ml-auto text-xs tabular-nums text-ash-700">{timeAgo(alert.createdAt, now)}, {timeFi(alert.createdAt)}</span>
        </div>
        <h2 className="mt-6 display-xl text-[clamp(1.5rem,3vw,2.4rem)]">{alert.message}</h2>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <button type="button" onClick={() => onDealer(d.id)} className="inline-flex min-h-9 items-center gap-2 font-semibold underline decoration-ink/30 decoration-2 underline-offset-4 hover:decoration-ink">
            {d.name}, {d.city} <span aria-hidden>→</span>
          </button>
          <TierBadge tier={d.tier} />
          <span>{car.year} {car.make} {car.model}, <span className="font-mono text-xs">{car.plate}</span>, <span className="font-mono text-xs break-all">{car.vin}</span></span>
        </div>
      </header>

      <section className="border-t border-ink bg-mist px-4 py-8 md:px-8" aria-labelledby="next-step-h">
        <h3 id="next-step-h" className="text-sm text-ash-700">Next step</h3>
        <p className="mt-2 display-lg">{recommend(alert, ci, visit)}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" disabled={!open || !!visit || alert.step === "auditor"} onClick={() => actions.bringVisitForward(alert.id)}>
            Bring spot check forward
          </Button>
          <Button variant="secondary" disabled={!open || alert.step === "auditor"} onClick={() => actions.escalateToAuditor(alert.id)}>
            Order full count
          </Button>
          <Button variant="secondary" disabled={!open} onClick={() => actions.resolveAlert(alert.id, "resolved_ok")}>
            Clear (resolved)
          </Button>
          <Button variant="danger" disabled={!open} onClick={() => actions.resolveAlert(alert.id, "confirmed_fraud")}>
            Confirm sold out of trust
          </Button>
        </div>
      </section>

      <CreditDecision d={d} alert={alert} />

      <Ladder stepIdx={stepIdx} alert={alert} />

      {visit && <SpotCheckCard s={s} alert={alert} visit={visit} now={now} />}

      <TargetedCheckIn ci={ci} vin={alert.vin} severity={alert.severity} />


      <Block title="Evidence">
        <dl className="divide-y divide-line border-y border-line">
          {alert.evidence.map((e, i) => (
            <div key={i} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="tag-text text-ash-700 sm:pt-0.5">{e.label}</dt>
              <dd className="text-sm">{e.value}</dd>
            </div>
          ))}
        </dl>
      </Block>
    </div>
  );
}

function recommend(a: Alert, ci?: CheckIn, v?: SpotCheck): string {
  if (a.status === "resolved_ok") return "Cleared.";
  if (a.status === "confirmed_fraud") return "Confirmed. Hand over to recovery.";
  if (a.step === "auditor") return "Full count ordered. Decide after the visit.";
  if (v?.verifier.status === "offered") return "Spot check brought forward. Waiting for a verifier.";
  if (v?.verifier.status === "en_route") return `${v.verifier.name} en route.`;
  if (v?.verifier.status === "on_site") return `${v.verifier.name} on the lot.`;
  if (v) return visitFoundCar(v, a.vin) ? "Car found. Clear the alert." : "Car not found. Escalate or confirm.";
  if (ci && (ci.status === "scheduled" || ci.status === "in_progress")) return "Wait for the dealer's check-in.";
  if (ci?.status === "missed") return "Check-in window missed. Bring the spot check forward.";
  if (ci?.status === "completed") return ci.outcome === "clean" ? "Photographed on site. Clear it." : "Check-in failed. Bring the spot check forward.";
  if (a.source === "marketplace" || a.source === "registry") return "Payoff missed. Decide whether to send a spot check.";
  if (a.severity === "low") return "Look at the photos, then clear or follow up.";
  return "Keep watching.";
}

function Ladder({ stepIdx, alert }: { stepIdx: number; alert: Alert }) {
  const closed = !isOpen(alert);
  return (
    <Block title="Escalation">
      <ol className="grid grid-cols-2 border border-ink sm:grid-cols-4">
        {LADDER.map((l, i) => {
          const current = i === stepIdx && !closed;
          const done = i < stepIdx || (closed && i <= stepIdx);
          return (
            <li
              key={l.step}
              aria-current={current ? "step" : undefined}
              className={`relative flex flex-col gap-1 p-3 sm:p-4 ${i % 2 ? "border-l border-ink" : ""} ${i >= 2 ? "border-t border-ink sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""} ${current ? "bg-ink text-paper" : done ? "bg-paper" : "bg-paper text-ash-500"}`}
            >
              <span className="flex items-center justify-between">
                <span className={`flex size-6 items-center justify-center border tag-text ${current ? "border-paper" : done ? "border-lime bg-lime text-ink" : "border-ash-300"}`}>
                  {done ? "✓" : i + 1}
                </span>
                <span className="figure text-xl">{l.cost}</span>
              </span>
              <span className="mt-2 display-md">{l.title}</span>
              <span className={`text-xs leading-snug ${current ? "text-paper/75" : ""}`}>{l.who}</span>
              {current && <span className="sr-only">(current step)</span>}
            </li>
          );
        })}
      </ol>
    </Block>
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
    <Block title="Spot check" note={`${visit.sampledVins.length} cars, ${eur(v.fee)}`} action={<span className="text-xs text-ash-700">{v.name}, <span className="font-mono">{v.visitCode}</span></span>}>
    <div className={`border border-ink ${reported ? (found ? "bg-lime" : "bg-high-soft") : "bg-paper"}`}>
      <ol className="grid grid-cols-4 border-b border-ink">
        {V_STEPS.map((st, i) => {
          const at = v[st.key];
          return (
            <li key={st.key} className={`min-w-0 px-2 py-2 sm:px-3 ${i > 0 ? "border-l border-line" : ""} ${at ? "" : "text-ash-500"}`}>
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
            <p className="mt-1 text-sm text-ash-700">This car + {others.length} random</p>
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
              <img src={photo.thumbnails.car} alt={`Verifier photo of ${s.cars.find((c) => c.vin === alert.vin)?.plate ?? alert.vin}`} className="w-40 border border-line object-cover" />
            )}
          </div>
        )}
      </div>
    </div>
    </Block>
  );
}

const CI_STATUS: Record<CheckIn["status"], string> = {
  scheduled: "Window set",
  in_progress: "In progress",
  completed: "Completed",
  missed: "Window missed",
};

function TargetedCheckIn({ ci, vin, severity }: { ci?: CheckIn; vin: string; severity: string }) {
  if (!ci) {
    return (
      <Block title="Targeted check-in" note={severity === "low" ? "Not sent (low)" : "None"} />
    );
  }
  const r = ci.results[vin];
  const photo = r && !("skipped" in r) ? r : null;
  return (
    <Block title="Targeted check-in" action={<Tag tone={ci.status === "completed" ? (ci.outcome === "clean" ? "lime" : "high") : "muted"}>{ci.status === "completed" ? ci.outcome : ci.status.replace("_", " ")}</Tag>}>
      <p className="font-semibold">{CI_STATUS[ci.status]}: {ci.window.label}{ci.rescheduled ? " (rescheduled once)" : ""}</p>
      {r && "skipped" in r && <p className="mt-2 text-sm">Dealer skipped this car.</p>}
      {photo && <PhotoReads photo={photo} />}
    </Block>
  );
}

/** What the AI photo model read, and the silent checks, in one compact list. Bank only. */
export function PhotoReads({ photo }: { photo: PhotoCheck }) {
  const items: [string, string, boolean | null][] = [
    ["VIN", `${photo.readVin ?? "unreadable"} · ${photo.vinMatch.replace("_", " ")} (${Math.round(photo.confidence * 100)}%)`, photo.vinMatch === "exact" || photo.vinMatch === "ocr_tolerant"],
  ];
  if (photo.plate) items.push(["Plate", `${photo.plate.read ?? "unreadable"}`, photo.plate.match]);
  if (photo.code) items.push(["One-time code", `${photo.code.read ?? "not visible"} (expected ${photo.code.expected})`, photo.code.match]);
  if (photo.carMatch) items.push(["Make, colour", `${photo.carMatch.read ?? "not read"} (loan: ${photo.carMatch.expected})`, photo.carMatch.match]);
  if (photo.odometer) items.push(["Odometer", photo.odometer.readKm != null ? `${photo.odometer.readKm.toLocaleString("en")} km${photo.odometer.deltaKm != null ? ` (+${photo.odometer.deltaKm})` : ""}` : "unreadable", photo.odometer.plausible]);
  items.push(["Location", photo.location ? `${photo.location.inside ? "on the lot" : `${formatDistance(photo.location.distanceM)} away`}${photo.location.simulated ? " (simulated)" : ""}` : "no location", photo.location?.inside ?? false]);
  if (photo.ip) items.push(["IP (info only)", `${photo.ip.area}`, null]);
  items.push(["Inside window", photo.freshness.insideWindow ? "yes" : "no", photo.freshness.insideWindow]);
  items.push(["Photo reuse", photo.reuse.duplicate ? "matches an earlier photo" : "none", !photo.reuse.duplicate]);
  items.push(["Fake photo", photo.fakeSuspected ? "screen or print suspected" : "none seen", !photo.fakeSuspected]);
  return (
    <div className="mt-3">
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-xs">
        {items.map(([k, v, ok]) => (
          <div key={k} className="contents">
            <dt className="tag-text text-ash-700">{k}</dt>
            <dd className="font-mono">{ok === null ? "" : ok ? "✓ " : "✗ "}{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm font-semibold">
        {photo.verified ? "Verified ✓" : photo.needsLook?.length ? `Needs a look: ${photo.needsLook.join(", ")}` : "Not verified"}
        <span className="ml-2 font-normal text-ash-700">Read by {photo.reader === "claude" ? "the AI photo model" : "the simulated photo model"}</span>
      </p>
    </div>
  );
}

/** The rules may recommend pausing credit; only the officer can do it. */
function CreditDecision({ d, alert }: { d: Dealer; alert: Alert }) {
  if (d.creditPaused) {
    return (
      <Block title="Credit" note={`Paused ${dateFi(d.creditPaused.at)}`} action={<Button variant="secondary" onClick={() => actions.resumeCredit(d.id)}>Resume credit</Button>}>
        <p className="text-sm">New drawdowns for {d.name} are on hold. Reason: {d.creditPaused.reason}.</p>
      </Block>
    );
  }
  if (!alert.recommendPause || !isOpen(alert)) return null;
  return (
    <section className="border-t border-ink bg-high-soft px-4 py-6 md:px-8" aria-labelledby="pause-h">
      <h3 id="pause-h" className="display-md">Recommended: pause credit</h3>
      <p className="mt-1 text-sm">Both sources show this sale and the payoff is missing. The system won&apos;t pause anything on its own.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="danger" onClick={() => actions.pauseCredit(d.id, alert.id)}>Pause credit</Button>
      </div>
    </section>
  );
}
