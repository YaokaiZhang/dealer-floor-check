"use client";
import { useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { actions, useDemo, useHydrated, type Store } from "@/lib/store";
import { getPosition, lastOdometer, submitShots, type Fix, type Shots } from "@/lib/verify";
import { ShotSequence } from "@/components/capture/ShotSequence";
import { distanceM, formatDistance } from "@/lib/geo";
import { eur, timeFi } from "@/lib/format";
import type { Alert, Car, Dealer, PhotoCheck } from "@/lib/types";

/**
 * The freelancer's phone app. A vetted local person takes a paid one-car job,
 * goes to the lot, photographs the VIN plate (or says why the car isn't there) and is paid.
 * They never see the alert behind the job, so visits stay neutral and can't be "tipped".
 */

type Job = { alert: Alert; dealer: Dealer; car: Car };

const NOT_FOUND_REASONS = [
  "Staff say it's out on a test drive",
  "Staff say it has been sold",
  "Staff don't know where it is",
  "Couldn't get access to the lot",
];

function jobsOf(s: Store): Job[] {
  return s.alerts
    .filter((a) => a.verifier)
    .map((a) => ({ alert: a, dealer: s.dealers.find((d) => d.id === a.dealerId)!, car: s.cars.find((c) => c.vin === a.vin)! }))
    .sort((a, b) => Date.parse(b.alert.verifier!.dispatchedAt) - Date.parse(a.alert.verifier!.dispatchedAt));
}

export function VerifierShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-mist">
      <RoleSwitcher compact />
      <main className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-md border-x border-ink bg-paper pb-16">{children}</main>
    </div>
  );
}

export function VerifierApp() {
  const hydrated = useHydrated();
  const s = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const [declined, setDeclined] = useState<string[]>([]);

  if (!hydrated) {
    return (
      <VerifierShell>
        <div className="animate-pulse space-y-4 p-4" aria-hidden>
          <div className="h-12 w-2/3 bg-ash-100" />
          <div className="h-40 w-full bg-ash-100" />
        </div>
      </VerifierShell>
    );
  }

  const jobs = jobsOf(s);
  const active = jobs.find((j) => j.alert.id === openId) ?? jobs.find((j) => j.alert.verifier!.status === "en_route" || j.alert.verifier!.status === "on_site");
  const offered = jobs.filter((j) => j.alert.verifier!.status === "offered" && !declined.includes(j.alert.id));
  const done = jobs.filter((j) => j.alert.verifier!.status === "reported" && !j.alert.verifier!.simulated);
  const earned = done.reduce((sum, j) => sum + j.alert.verifier!.fee, 0);
  const me = active?.alert.verifier!.name ?? offered[0]?.alert.verifier!.name ?? "Sanna M.";

  return (
    <VerifierShell>
      <section className="border-b border-ink px-4 pt-6 pb-5">
        <div className="flex items-center justify-between gap-2">
          <Tag tone="brand">Freelance verifier</Tag>
          <span className="tag-text text-ash-700">Vetted · ID checked</span>
        </div>
        <h1 className="mt-3 display-xl">Hi {me.split(" ")[0]}</h1>
        <dl className="mt-4 grid grid-cols-2 border border-ink">
          <div className="px-3 py-2">
            <dt className="tag-text text-ash-700">Earned today</dt>
            <dd className="figure text-2xl">{eur(earned)}</dd>
          </div>
          <div className="border-l border-ink px-3 py-2">
            <dt className="tag-text text-ash-700">Visits done</dt>
            <dd className="figure text-2xl">{done.length}</dd>
          </div>
        </dl>
      </section>

      <div className="space-y-6 px-4 pt-5">
        {active ? (
          <ActiveJob key={active.alert.id} job={active} s={s} onClose={() => setOpenId(null)} />
        ) : (
          <>
            <section>
              <h2 className="mb-3 display-md">Jobs near you</h2>
              {offered.length === 0 ? (
                <Card className="p-5">
                  <p className="font-medium">No jobs nearby</p>
                  <a href="/bank" className="mt-1 inline-block py-2 tag-text text-ash-700 underline underline-offset-4" target="_blank" rel="noreferrer">Dispatch one from the bank ↗</a>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {offered.map((j) => (
                    <li key={j.alert.id}>
                      <OfferCard job={j} onAccept={() => { actions.verifierAccept(j.alert.id); setOpenId(j.alert.id); }} onDecline={() => setDeclined((d) => [...d, j.alert.id])} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {done.length > 0 && (
              <section>
                <h2 className="mb-3 display-md">Completed</h2>
                <Card className="divide-y divide-ash-100">
                  {done.map((j) => (
                    <div key={j.alert.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span>
                        <span className="block font-medium">{j.car.make} {j.car.model} · {j.dealer.name}</span>
                        <span className="block tag-text text-ash-700">{timeFi(j.alert.verifier!.reportedAt!)} · {j.alert.verifier!.found ? "car found" : "not on the lot"}</span>
                      </span>
                      <span className="figure text-lg">+{eur(j.alert.verifier!.fee)}</span>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            <section>
              <p className="mb-2 tag-text text-ash-700">How jobs work</p>
              <ul className="grid grid-cols-2 border border-ink bg-brand-soft">
                {[["1 car", "per job"], ["~20 min", "on site"], ["Paid", "found or not"], ["Neutral", "you're not told why"]].map(([k, sub], i) => (
                  <li key={k} className={`p-3 ${i % 2 ? "border-l border-ink" : ""} ${i > 1 ? "border-t border-ink" : ""}`}>
                    <p className="figure text-xl">{k}</p>
                    <p className="tag-text text-ash-700">{sub}</p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </VerifierShell>
  );
}

function OfferCard({ job, onAccept, onDecline }: { job: Job; onAccept: () => void; onDecline: () => void }) {
  const { dealer, car, alert } = job;
  // Fictional travel distance for the demo: verifiers are matched within the dealer's city.
  const km = 2 + (parseInt(alert.id.replace(/\D/g, "").slice(-2) || "4", 10) % 9);
  return (
    <Card className="animate-rise overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-ink bg-lime px-4 py-3">
        <div>
          <p className="tag-text">{dealer.city} · {km} km away</p>
          <p className="mt-1 display-md">{dealer.name}</p>
        </div>
        <span className="figure text-3xl">{eur(alert.verifier!.fee)}</span>
      </div>
      <div className="px-4 py-3 text-sm">
        <p><b>{car.year} {car.make} {car.model}</b> · {car.color.toLowerCase()}</p>
        <p className="mt-1 tag-text text-ash-700">~20 min · posted {timeFi(alert.verifier!.dispatchedAt)}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-ink p-3">
        <Button arrow className="min-h-12" onClick={onAccept}>Accept job</Button>
        <Button variant="secondary" className="min-h-12" onClick={onDecline}>Not now</Button>
      </div>
    </Card>
  );
}

function ActiveJob({ job, s, onClose }: { job: Job; s: Store; onClose: () => void }) {
  const { alert, dealer, car } = job;
  const v = alert.verifier!;
  const [busy, setBusy] = useState(false);
  const [tooFar, setTooFar] = useState<number | null>(null);
  const [photo, setPhoto] = useState<PhotoCheck | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<"found" | "missing">("found");
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const arrive = async () => {
    setBusy(true);
    setTooFar(null);
    try {
      const pos = await getPosition();
      const g = dealer.geofence;
      let arrival: PhotoCheck["location"] = null;
      if (pos) {
        const p = { lat: pos.lat, lng: pos.lng };
        const d = distanceM(p, g);
        arrival = { ...p, accuracyM: Math.round(pos.accuracy), distanceM: Math.round(d), inside: d <= g.radiusM + Math.min(pos.accuracy, 150), simulated: false };
      }
      if ((!arrival || !arrival.inside) && s.flags.simulateOnSite) {
        const p = { lat: g.lat + (Math.random() - 0.5) * 0.001, lng: g.lng + (Math.random() - 0.5) * 0.001 };
        arrival = { ...p, accuracyM: 10, distanceM: Math.round(distanceM(p, g)), inside: true, simulated: true };
      }
      if (!arrival?.inside) { setTooFar(arrival?.distanceM ?? -1); return; }
      actions.verifierArrive(alert.id, arrival);
    } finally {
      setBusy(false);
    }
  };

  const onShots = async (shots: Shots, positions: Fix[], simulated: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      const check = await submitShots({
        shots, positions, simulated, car,
        geofence: dealer.geofence,
        lastKnownOdometerKm: lastOdometer(s, car.vin),
        simulateOnSite: s.flags.simulateOnSite,
        forceUnreadable: s.flags.nextPhotoUnreadable,
      });
      if (s.flags.nextPhotoUnreadable) actions.setFlag("nextPhotoUnreadable", false);
      setPhoto(check);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      setAttempt((a) => a + 1);
    }
  };

  const submit = () => {
    if (mode === "found") {
      actions.verifierSubmit(alert.id, { found: true, photo: photo ?? undefined, odometerKm: photo?.odometer?.readKm ?? undefined, note: note || undefined });
    } else {
      actions.verifierSubmit(alert.id, { found: false, notFoundReason: reason ?? undefined, note: note || undefined });
    }
    window.scrollTo({ top: 0 });
  };

  if (v.status === "reported") {
    return (
      <div className="animate-rise space-y-4" role="status">
        <div className="flex items-center gap-4 border border-ink bg-lime p-4">
          <span className="flex size-12 shrink-0 items-center justify-center bg-ink text-lime" aria-hidden>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>
          </span>
          <div>
            <p className="display-md">Report sent</p>
            <p className="text-sm">+{eur(v.fee)}</p>
          </div>
        </div>
        <Button arrow className="min-h-12 w-full" onClick={onClose}>Back to jobs</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-3 border border-ink tag-text">
        {(["Travel", "On site", "Report"] as const).map((l, i) => {
          const idx = v.status === "en_route" ? 0 : 1;
          return (
            <li key={l} className={`px-2 py-2 text-center ${i > 0 ? "border-l border-ink" : ""} ${i === idx ? "bg-ink text-paper" : i < idx ? "bg-lime" : "text-ash-500"}`}>
              {i < idx ? "✓ " : ""}{l}
            </li>
          );
        })}
      </ol>

      <Card className="overflow-hidden">
        <div className="border-b border-ink bg-brand-soft px-5 py-4">
          <p className="tag-text text-ash-700">{dealer.name} · {dealer.city}</p>
          <h2 className="mt-2 display-xl">{car.make} {car.model}</h2>
          <p className="mt-1 text-ash-700">{car.year} · {car.color}</p>
        </div>
        <dl className="grid grid-cols-2 text-sm">
          <div className="border-r border-ink px-5 py-3">
            <dt className="tag-text text-ash-700">Plate</dt>
            <dd className="mt-1"><span className="inline-block border border-ink px-2 py-0.5 font-mono text-base font-medium tracking-wider">{car.plate}</span></dd>
          </div>
          <div className="px-5 py-3">
            <dt className="tag-text text-ash-700">VIN ends in</dt>
            <dd className="mt-1 font-mono text-lg font-medium tracking-[0.2em]">{car.vin.slice(-6)}</dd>
          </div>
        </dl>
      </Card>

      <div className="flex items-center justify-between gap-3 border border-ink p-4">
        <div>
          <p className="tag-text text-ash-700">Your visit code</p>
          <p className="mt-1 font-mono text-2xl font-medium tracking-[0.15em]">{v.visitCode}</p>
        </div>
        <p className="max-w-[9rem] text-right text-xs text-ash-700">Staff see this code too</p>
      </div>

      {v.status === "en_route" ? (
        <div>
          <Button arrow className="min-h-14 w-full text-base" disabled={busy} onClick={arrive}>{busy ? "Checking location…" : "I'm at the lot"}</Button>
          {tooFar !== null && (
            <p className="mt-3 border border-ink bg-mist p-3 text-sm" role="status">
              {tooFar < 0 ? "No location. Allow access and retry." : `${formatDistance(tooFar)} from the lot.`}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 border border-ink" role="tablist" aria-label="Is the car here?">
            {([["found", "Car is here"], ["missing", "Car isn't here"]] as const).map(([k, l], i) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                className={`min-h-12 px-2 text-sm font-medium ${i > 0 ? "border-l border-ink" : ""} ${mode === k ? "bg-ink text-paper" : "hover:bg-brand-soft"}`}>
                {l}
              </button>
            ))}
          </div>

          {mode === "found" ? (
            <>
              {busy ? (
                <div className="flex min-h-28 items-center justify-center border border-ink bg-mist" role="status"><p className="font-medium">Checking the photos…</p></div>
              ) : photo ? (
                <div className={`flex items-center gap-3 border border-ink p-3 ${photo.verified ? "bg-lime" : "bg-mist"}`} role="status">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {photo.thumbnails?.car && <img src={photo.thumbnails.car} alt="" className="size-16 border border-ink object-cover" />}
                  <div className="text-sm">
                    <p className="font-medium">{photo.verified ? "Car matches ✓" : "Couldn't confirm the car"}</p>
                    {photo.odometer?.readKm != null && <p className="font-mono text-ash-700">{photo.odometer.readKm.toLocaleString("en")} km</p>}
                    {!photo.verified && <p className="text-ash-700">Closer, no glare.</p>}
                    <button type="button" className="mt-1 min-h-8 underline underline-offset-4" onClick={() => setPhoto(null)}>Retake</button>
                  </div>
                </div>
              ) : (
                <>
                  {failed && <p className="border border-ink bg-mist p-3 text-sm" role="status">Couldn&apos;t send the photos. Retake.</p>}
                  <ShotSequence key={attempt} car={car} allowDemo={s.flags.demoCamera} onDone={onShots} />
                </>
              )}
            </>
          ) : (
            <fieldset>
              <legend className="tag-text text-ash-700">What did staff tell you?</legend>
              <div className="mt-2 space-y-2">
                {NOT_FOUND_REASONS.map((r) => (
                  <label key={r} className={`flex min-h-12 cursor-pointer items-center gap-3 border border-ink px-3 text-sm ${reason === r ? "bg-brand" : "hover:bg-brand-soft"}`}>
                    <input type="radio" name="reason" className="accent-ink" checked={reason === r} onChange={() => setReason(r)} />
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <label className="block">
            <span className="tag-text text-ash-700">Note for the lender (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 block w-full border border-ink bg-paper p-3 text-sm" />
          </label>

          <Button arrow className="min-h-14 w-full text-base" disabled={busy || (mode === "found" ? !photo : !reason)} onClick={submit}>
            Send report · get {eur(v.fee)}
          </Button>
        </div>
      )}
    </div>
  );
}
