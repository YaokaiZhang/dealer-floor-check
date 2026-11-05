"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { actions, useDemo } from "@/lib/store";
import { submitShots, type Fix, type Shots } from "@/lib/verify";
import { ShotSequence } from "@/components/capture/ShotSequence";
import type { Car, CheckIn, PhotoCheck } from "@/lib/types";

type Result = CheckIn["results"][string] | undefined;
const isSkipped = (r: Result): r is { skipped: true } => !!r && "skipped" in r;
const isVerified = (r: Result) => !!r && !isSkipped(r) && (r as PhotoCheck).verified;
const settled = (r: Result) => isSkipped(r) || isVerified(r);

export function CaptureFlow({ checkIn, onComplete }: { checkIn: CheckIn; onComplete: () => void }) {
  const state = useDemo();
  const [ackVin, setAckVin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const vins = checkIn.sampledVins;
  const firstOpen = vins.find((v) => !settled(checkIn.results[v]));
  const shownVin = ackVin ?? firstOpen;
  const index = shownVin ? vins.indexOf(shownVin) : vins.length - 1;
  const car = shownVin ? state.cars.find((c) => c.vin === shownVin) : undefined;
  const result: Result = shownVin ? checkIn.results[shownVin] : undefined;
  const isLast = vins.filter((v) => v !== shownVin && !settled(checkIn.results[v])).length === 0;

  const onShots = async (shots: Shots, positions: Fix[], simulated: boolean) => {
    if (!shownVin || !car) return;
    setBusy(true);
    setFailed(false);
    // Hold this car on screen while the result arrives, so the next car doesn't flash in first.
    setAckVin(shownVin);
    try {
      const check = await submitShots({ job: "check_in", id: checkIn.id, carVin: car.vin, shots, positions, simulated });
      if (!check.verified) setAckVin(null);
    } catch {
      setAckVin(null);
      setFailed(true);
    } finally {
      setBusy(false);
      setAttempt((a) => a + 1);
    }
  };

  const next = () => {
    setAckVin(null);
    setFailed(false);
    if (isLast) onComplete();
    else window.scrollTo({ top: 0 });
  };

  const skip = () => {
    if (!shownVin) return;
    actions.skipCar(checkIn.id, shownVin);
    setAckVin(null);
    setFailed(false);
    if (isLast) onComplete();
  };

  return (
    <div>
      <Progress checkIn={checkIn} currentVin={shownVin} index={car ? index : undefined} />

      {!car ? (
        <div className="mt-6">
          <p className="display-lg">That&apos;s every car</p>
          <Button arrow className="mt-5 min-h-14 w-full text-base" onClick={onComplete}>Finish check-in</Button>
        </div>
      ) : (
        <section key={car.vin} className="mt-5 animate-rise" aria-label={`${car.make} ${car.model}`}>
          <CarId car={car} />

          <div className="mt-4">
            {busy ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 border border-ink bg-mist text-center" role="status" aria-live="polite">
                <span className="flex gap-1.5" aria-hidden>
                  {[0, 1, 2].map((i) => <span key={i} className="size-2 animate-pulse-dot bg-ink" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </span>
                <p className="font-medium">Checking the photos…</p>
              </div>
            ) : isVerified(result) ? (
              <div role="status" aria-live="polite">
                <div className="flex items-center gap-4 border border-ink bg-lime p-4">
                  <span className="flex size-12 shrink-0 items-center justify-center bg-ink text-lime animate-pop" aria-hidden>
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" pathLength={1} strokeDasharray="1" className="animate-draw" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>
                  </span>
                  <p className="display-md">Verified</p>
                </div>
                <Button arrow className="mt-4 min-h-14 w-full text-base" onClick={next}>{isLast ? "Finish check-in" : "Next car"}</Button>
              </div>
            ) : (result && !isSkipped(result)) || failed ? (
              <div>
                <div className="animate-rise border border-ink border-l-4 border-l-medium bg-paper px-4 py-3" role="status" aria-live="polite">
                  <p className="font-medium">{failed ? "Couldn't send the photos" : "We couldn't confirm this car"}</p>
                  <p className="mt-0.5 text-sm text-ash-700">{failed ? "Check the connection and retake." : "Retake: closer, no glare."}</p>
                </div>
                <div className="mt-4"><ShotSequence key={attempt} car={car} allowDemo={state.flags.demoCamera} onDone={onShots} /></div>
                <Button variant="secondary" className="mt-3 min-h-12 w-full" onClick={skip}>Skip for now</Button>
              </div>
            ) : (
              <>
                <ShotSequence key={`${car.vin}-${attempt}`} car={car} allowDemo={state.flags.demoCamera} onDone={onShots} />
                <button type="button" onClick={skip} className="mt-1 min-h-11 w-full text-sm font-medium text-ash-700 underline underline-offset-4">
                  Can&apos;t find it? Skip for now
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/** Just enough to spot the car on the lot: model, colour, plate, end of the VIN. */
function CarId({ car }: { car: Car }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink pb-4">
      <div className="min-w-0">
        <h2 className="display-lg">{car.make} {car.model}</h2>
        <p className="mt-1.5 text-sm text-ash-700">{car.color}, {car.year}</p>
      </div>
      <dl className="shrink-0 text-right">
        <dt className="sr-only">Plate</dt>
        <dd><span className="inline-block border-2 border-ink px-2 py-0.5 font-mono text-base font-semibold tracking-wider">{car.plate}</span></dd>
        <dt className="mt-1.5 text-xs text-ash-700">VIN ends</dt>
        <dd className="font-mono text-sm font-medium tracking-[0.15em]">{car.vin.slice(-6)}</dd>
      </dl>
    </div>
  );
}

function Progress({ checkIn, currentVin, index }: { checkIn: CheckIn; currentVin?: string; index?: number }) {
  const vins = checkIn.sampledVins;
  const doneCount = vins.filter((v) => settled(checkIn.results[v])).length;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="font-medium">{checkIn.reason === "targeted" ? "Quick photo" : "Check-in"}</p>
        {index !== undefined && vins.length > 1 && <p className="text-ash-700 tabular-nums">Car {index + 1} of {vins.length}</p>}
      </div>
      <ol className="mt-2 flex gap-1" aria-label={`${doneCount} of ${vins.length} cars done`}>
        {vins.map((v) => {
          const r = checkIn.results[v];
          const cls = isVerified(r) ? "bg-lime" : isSkipped(r) ? "bg-ash-300" : v === currentVin ? "bg-ink" : "bg-paper";
          return <li key={v} className={`h-2 flex-1 border border-ink transition-colors duration-300 ${cls}`} />;
        })}
      </ol>
    </div>
  );
}
