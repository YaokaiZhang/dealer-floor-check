"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ShotSequence } from "@/components/capture/ShotSequence";
import { ScanCar } from "@/components/ui/ScanCar";
import { actions, type Store } from "@/lib/store";
import { submitShots, type Fix, type Shots } from "@/lib/verify";
import type { Car, Dealer, SpotCheck } from "@/lib/types";
import { Plate, ScreenTitle, Swatch } from "./shared";

const NOT_FOUND_REASONS = [
  "Staff say it's out on a test drive",
  "Staff say it has been sold",
  "Staff don't know where it is",
  "Couldn't get access to the lot",
];
const OTHER = "Other";

export function CarCheck({ visit, dealer, car, s, next, onNext, onBack }: {
  visit: SpotCheck;
  dealer: Dealer;
  car: Car;
  s: Store;
  /** The next car still to check, offered straight from a confirmed result. */
  next?: Car;
  onNext: (vin: string) => void;
  onBack: () => void;
}) {
  const existing = visit.results[car.vin];
  const [mode, setMode] = useState<"found" | "missing">(existing?.status === "missing" ? "missing" : "found");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const saved = existing?.status === "missing" ? existing.reason ?? null : null;
  const savedIsOther = saved != null && !NOT_FOUND_REASONS.includes(saved);
  const [reason, setReason] = useState<string | null>(savedIsOther ? OTHER : saved);
  const [otherText, setOtherText] = useState(savedIsOther ? saved : "");
  const finalReason = reason === OTHER ? otherText.trim() : reason;
  const photo = existing?.status === "found" ? existing.photo : undefined;

  const onShots = async (shots: Shots, positions: Fix[], simulated: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      await submitShots({ job: "spot_check", id: visit.id, carVin: car.vin, shots, positions, simulated });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      setAttempt((a) => a + 1);
    }
  };

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between gap-3 border-b border-ink pr-4">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 px-4 text-sm font-medium hover:bg-brand-soft focus-visible:bg-brand-soft">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" /></svg>
          All cars
        </button>
        <span className="truncate text-sm text-ash-700">{dealer.name}</span>
      </div>

      <ScreenTitle long sub={<span className="flex items-center gap-1.5"><Swatch color={car.color} />{car.color}, {car.year}</span>}>{car.make} {car.model}</ScreenTitle>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-6">
        <Plate plate={car.plate} size="lg" />
        <p className="text-base text-ash-700">VIN <span className="figure tracking-[0.06em] text-ink">…{car.vin.slice(-6)}</span></p>
      </div>

      <div className="grid grid-cols-2 border-y border-ink" role="tablist" aria-label="Is the car here?">
        {([["found", "Car is here"], ["missing", "Car isn't here"]] as const).map(([k, l], i) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={`min-h-14 px-2 text-base font-medium transition-colors ${i > 0 ? "border-l border-ink" : ""} ${mode === k ? "bg-ink text-paper" : "hover:bg-brand-soft"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="px-4">
        <div className="mt-6">
          {mode === "found" ? (
            busy ? (
              <Checking />
            ) : photo ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-4 border border-ink p-4 ${photo.verified ? "bg-lime" : "bg-high-soft"}`} role="status">
                  {photo.thumbnails?.car
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.thumbnails.car} alt="" className="size-20 shrink-0 border border-ink object-cover" />
                    : null}
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 display-md">
                      {photo.verified && (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden><path d="M3 10.5l4.5 4.5L17 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" pathLength={1} strokeDasharray={1} className="animate-draw" /></svg>
                      )}
                      {photo.verified ? "Car matches" : "Couldn't confirm"}
                    </p>
                    {photo.odometer?.readKm != null && <p className="mt-2 figure text-base">{photo.odometer.readKm.toLocaleString("en")} km</p>}
                    {!photo.verified && <p className="mt-1 text-sm">Get closer and avoid glare.</p>}
                  </div>
                </div>
                {photo.verified ? (
                  <>
                    {next ? (
                      <>
                        <Button arrow className="min-h-14 w-full text-base" onClick={() => onNext(next.vin)}>
                          <span className="min-w-0 truncate">Next: {next.make} {next.model}</span>
                          <span className="shrink-0 border border-paper/60 px-1.5 py-0.5 figure text-sm tracking-[0.06em]">{next.plate}</span>
                        </Button>
                        <Button variant="secondary" className="min-h-12 w-full" onClick={onBack}>Back to the list</Button>
                      </>
                    ) : (
                      <Button arrow className="min-h-14 w-full text-base" onClick={onBack}>Back to the list</Button>
                    )}
                    <button type="button" className="min-h-11 w-full text-sm text-ash-700 underline underline-offset-4" onClick={() => actions.verifierCar(visit.id, car.vin, null)}>Retake photos</button>
                  </>
                ) : (
                  <>
                    <Button className="min-h-14 w-full text-base" onClick={() => actions.verifierCar(visit.id, car.vin, null)}>Retake photos</Button>
                    <Button variant="secondary" className="min-h-12 w-full" onClick={onBack}>Back to the list</Button>
                  </>
                )}
              </div>
            ) : (
              <>
                {failed && <p className="mb-3 border border-high bg-high-soft p-3 text-sm" role="status">Couldn&apos;t send the photos. Take them again.</p>}
                <ShotSequence key={attempt} car={car} allowDemo={s.flags.demoCamera} onDone={onShots} />
              </>
            )
          ) : (
            <fieldset>
              <legend className="display-md">What did staff say?</legend>
              <div className="-mx-4 mt-4 border-t border-ink">
                {[...NOT_FOUND_REASONS, OTHER].map((r) => (
                  <label key={r} className={`flex min-h-14 cursor-pointer items-center gap-3 border-b border-line px-4 py-2 text-base transition-colors has-focus-visible:bg-brand-soft ${reason === r ? "bg-brand" : "hover:bg-brand-soft"}`}>
                    <input type="radio" name="reason" className="size-4 accent-ink" checked={reason === r} onChange={() => setReason(r)} />
                    {r}
                  </label>
                ))}
                {reason === OTHER && (
                  <textarea
                    autoFocus
                    rows={2}
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    aria-label="What happened?"
                    placeholder="What happened?"
                    className="mx-4 mt-3 block w-[calc(100%-2rem)] resize-none border border-ink px-3 py-2.5 text-base placeholder:text-ash-500 focus:border-brand-deep focus:outline-none"
                  />
                )}
              </div>
              <Button arrow className="mt-6 min-h-14 w-full text-base" disabled={!finalReason} onClick={() => { actions.verifierCar(visit.id, car.vin, { status: "missing", reason: finalReason ?? undefined }); onBack(); }}>
                Mark as not here
              </Button>
            </fieldset>
          )}
        </div>
      </div>
    </div>
  );
}

/** Photos are being read on the server: the car is scanned until the answer is back. */
function Checking() {
  return (
    <div className="relative aspect-[4/3] overflow-hidden border border-ink bg-ink text-paper" role="status">
      <ScanCar tone="dark" scale={0.36} className="absolute inset-0 h-full w-full" title="" />
      <p className="absolute bottom-3 left-4 display-md">Checking the photos…</p>
    </div>
  );
}
