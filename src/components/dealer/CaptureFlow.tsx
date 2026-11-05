"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { actions, useDemo } from "@/lib/store";
import { submitShots, type Fix, type Shots } from "@/lib/verify";
import { ShotSequence } from "@/components/capture/ShotSequence";
import type { CheckIn, PhotoCheck } from "@/lib/types";

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
    try {
      const check = await submitShots({ job: "check_in", id: checkIn.id, carVin: car.vin, shots, positions, simulated });
      if (check.verified) setAckVin(shownVin);
    } catch {
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
    <div className="space-y-5">
      <Progress checkIn={checkIn} currentVin={shownVin} />

      {!car ? (
        <Card className="p-5">
          <p className="display-lg">That&apos;s every car</p>
          <Button arrow className="mt-5 min-h-14 w-full text-base" onClick={onComplete}>Finish check-in</Button>
        </Card>
      ) : (
        <Card key={car.vin} className="animate-rise overflow-hidden">
          <div className="border-b border-ink bg-brand-soft px-5 py-4">
            <p className="tag-text text-ash-700">Car {index + 1} of {vins.length}</p>
            <h2 className="mt-2 display-xl">{car.make} {car.model}</h2>
            <p className="mt-1 text-ash-700">{car.year}</p>
          </div>
          <dl className="grid grid-cols-2 border-b border-ink text-sm">
            <div className="border-r border-ink px-5 py-3">
              <dt className="tag-text text-ash-700">Colour</dt>
              <dd className="mt-1 text-base font-medium">{car.color}</dd>
            </div>
            <div className="px-5 py-3">
              <dt className="tag-text text-ash-700">Plate</dt>
              <dd className="mt-1"><span className="inline-block border border-ink px-2 py-0.5 font-mono text-base font-medium tracking-wider">{car.plate}</span></dd>
            </div>
            <div className="col-span-2 border-t border-ink px-5 py-3">
              <dt className="tag-text text-ash-700">VIN ends in</dt>
              <dd className="mt-1 font-mono text-xl font-medium tracking-[0.2em]">{car.vin.slice(-6)}</dd>
            </div>
          </dl>

          <div className="p-5">
            {busy ? (
              <div className="flex min-h-36 flex-col items-center justify-center gap-3 border border-ink bg-mist text-center" role="status" aria-live="polite">
                <span className="flex gap-1.5" aria-hidden>
                  {[0, 1, 2].map((i) => <span key={i} className="size-2 animate-pulse-dot bg-ink" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </span>
                <p className="font-medium">Checking the photos…</p>
              </div>
            ) : isVerified(result) ? (
              <div className="animate-rise" role="status" aria-live="polite">
                <div className="flex items-center gap-4 border border-ink bg-lime p-4">
                  <span className="flex size-12 shrink-0 items-center justify-center bg-ink text-lime" aria-hidden>
                    <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>
                  </span>
                  <div>
                    <p className="display-md">Verified</p>
                  </div>
                </div>
                <Button arrow className="mt-5 min-h-14 w-full text-base" onClick={next}>{isLast ? "Finish check-in" : "Next car"}</Button>
              </div>
            ) : (result && !isSkipped(result)) || failed ? (
              <div className="animate-rise" role="status" aria-live="polite">
                <div className="border border-ink bg-mist p-4">
                  <p className="font-medium">{failed ? "Couldn't send the photos" : "We couldn't confirm this car"}</p>
                  <p className="mt-1 text-sm text-ash-700">{failed ? "Check the connection and retake." : "Retake: closer, no glare."}</p>
                </div>
                <div className="mt-5"><ShotSequence key={attempt} car={car} allowDemo={state.flags.demoCamera} onDone={onShots} /></div>
                <Button variant="secondary" className="mt-3 min-h-12 w-full" onClick={skip}>Skip for now</Button>
              </div>
            ) : (
              <>
                <ShotSequence key={`${car.vin}-${attempt}`} car={car} allowDemo={state.flags.demoCamera} onDone={onShots} />
                <button type="button" onClick={skip} className="mt-3 min-h-11 w-full text-sm font-medium text-ash-700 underline underline-offset-4">
                  Can&apos;t find it? Skip for now
                </button>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Progress({ checkIn, currentVin }: { checkIn: CheckIn; currentVin?: string }) {
  const vins = checkIn.sampledVins;
  const doneCount = vins.filter((v) => settled(checkIn.results[v])).length;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="tag-text">{checkIn.reason === "targeted" ? "Quick photo" : "Check-in"}</p>
        <p className="tag-text text-ash-700">{doneCount} of {vins.length} done</p>
      </div>
      <ol className="mt-2 flex gap-1" aria-label={`${doneCount} of ${vins.length} cars done`}>
        {vins.map((v) => {
          const r = checkIn.results[v];
          const cls = isVerified(r) ? "bg-lime" : isSkipped(r) ? "bg-ash-300" : v === currentVin ? "bg-ink" : "bg-paper";
          return <li key={v} className={`h-2.5 flex-1 border border-ink ${cls}`} />;
        })}
      </ol>
    </div>
  );
}
