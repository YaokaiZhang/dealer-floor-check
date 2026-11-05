"use client";
import { useState } from "react";
import { ScanCar } from "@/components/ui/ScanCar";
import { actions, useDemo } from "@/lib/store";
import { submitShots, type Fix, type Shots } from "@/lib/verify";
import { ShotSequence } from "@/components/capture/ShotSequence";
import type { Car, CheckIn, PhotoCheck } from "@/lib/types";
import { Bar, Check, TextAction } from "./Bar";

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
        <div>
          <h2 className="px-4 pt-10 pb-8 display-wide text-[2.25rem]">That&apos;s every car</h2>
          <Bar onClick={onComplete}>Finish check-in</Bar>
        </div>
      ) : (
        <section key={car.vin} className="animate-rise" aria-label={`${car.make} ${car.model}`}>
          <CarId car={car} />

          <div className="border-t border-ink">
            {busy ? (
              <div className="relative border-b border-ink bg-mist" role="status" aria-live="polite">
                <ScanCar scale={0.36} className="block aspect-[4/3] w-full" title="" />
                <p className="absolute bottom-4 left-4 display-md">Checking the photos…</p>
              </div>
            ) : isVerified(result) ? (
              <div role="status" aria-live="polite">
                <div className="flex items-center justify-between gap-4 bg-lime px-4 py-8">
                  <p className="display-wide text-[2.25rem]">Verified</p>
                  <Check size={56} draw />
                </div>
                <Bar onClick={next}>{isLast ? "Finish check-in" : "Next car"}</Bar>
              </div>
            ) : (result && !isSkipped(result)) || failed ? (
              <div>
                <div className="animate-rise border-b border-ink border-l-4 border-l-medium bg-medium-soft px-4 py-3" role="status" aria-live="polite">
                  <p className="font-medium">{failed ? "Couldn't send the photos" : "We couldn't confirm this car"}</p>
                  <p className="mt-0.5 text-sm text-ash-700">{failed ? "Check the connection and retake." : "Retake: closer, no glare."}</p>
                </div>
                <div className="px-4 pt-4"><ShotSequence key={attempt} car={car} allowDemo={state.flags.demoCamera} onDone={onShots} /></div>
                <TextAction className="mt-2" onClick={skip}>Skip for now</TextAction>
              </div>
            ) : (
              <>
                <div className="px-4 pt-4"><ShotSequence key={`${car.vin}-${attempt}`} car={car} allowDemo={state.flags.demoCamera} onDone={onShots} /></div>
                <TextAction className="mt-2" onClick={skip}>Can&apos;t find it? Skip for now</TextAction>
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
    <div className="px-4 pt-8 pb-6">
      <h2 className="display-wide text-[clamp(2.2rem,10vw,3rem)] [overflow-wrap:anywhere]">{car.make}<br />{car.model}</h2>
      <dl className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <dt className="sr-only">Colour and year</dt>
          <dd className="text-sm text-ash-700">{car.color}, {car.year}</dd>
        </div>
        <div className="ml-auto flex items-end gap-4">
          <div className="text-right">
            <dt className="text-sm text-ash-700">VIN ends</dt>
            <dd className="figure text-lg tracking-[0.08em]">{car.vin.slice(-6)}</dd>
          </div>
          <div>
            <dt className="sr-only">Plate</dt>
            <dd><span className="inline-block border-2 border-ink px-2 py-1 figure text-xl tracking-[0.06em]">{car.plate}</span></dd>
          </div>
        </div>
      </dl>
    </div>
  );
}

function Progress({ checkIn, currentVin, index }: { checkIn: CheckIn; currentVin?: string; index?: number }) {
  const vins = checkIn.sampledVins;
  const doneCount = vins.filter((v) => settled(checkIn.results[v])).length;
  return (
    <div className="border-b border-ink px-4 pt-4 pb-4">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="font-medium">{checkIn.reason === "targeted" ? "Quick photo" : "Check-in"}</p>
        {index !== undefined && vins.length > 1 && <p className="text-ash-700 tabular-nums">Car {index + 1} of {vins.length}</p>}
      </div>
      <ol className="mt-3 flex gap-1" aria-label={`${doneCount} of ${vins.length} cars done`}>
        {vins.map((v) => {
          const r = checkIn.results[v];
          const cls = isVerified(r) ? "bg-lime border-lime" : isSkipped(r) ? "bg-ash-300 border-ash-300" : v === currentVin ? "bg-ink border-ink" : "bg-paper border-ink";
          return <li key={v} className={`h-2 flex-1 border transition-colors duration-300 ${cls}`} />;
        })}
      </ol>
    </div>
  );
}
