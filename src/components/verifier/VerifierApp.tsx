"use client";
import { useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { actions, useDemo, useHydrated, type Store } from "@/lib/store";
import { getPosition, submitShots, type Fix, type Shots } from "@/lib/verify";
import { ShotSequence } from "@/components/capture/ShotSequence";
import { formatDistance } from "@/lib/geo";
import { eur, timeFi } from "@/lib/format";
import type { Car, Dealer, SpotCheck, VisitCarResult } from "@/lib/types";

/**
 * The freelancer's phone app. A vetted local person takes a paid spot check: an unannounced visit
 * to a dealer lot to confirm a few random cars. Every visit looks the same, whether it is routine
 * or was brought forward by an alert, so visits stay neutral and can't be "tipped".
 */

type Job = { visit: SpotCheck; dealer: Dealer; cars: Car[] };

const NOT_FOUND_REASONS = [
  "Staff say it's out on a test drive",
  "Staff say it has been sold",
  "Staff don't know where it is",
  "Couldn't get access to the lot",
];

function jobsOf(s: Store): Job[] {
  return s.spotChecks
    .map((v) => ({
      visit: v,
      dealer: s.dealers.find((d) => d.id === v.dealerId)!,
      cars: v.sampledVins.map((vin) => s.cars.find((c) => c.vin === vin)!),
    }))
    .sort((a, b) => Date.parse(b.visit.verifier.dispatchedAt) - Date.parse(a.visit.verifier.dispatchedAt));
}

const confirmed = (r?: VisitCarResult) => r?.status === "found" && (!r.photo || r.photo.verified);

function VerifierShell({ children }: { children: React.ReactNode }) {
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
  const active = jobs.find((j) => j.visit.id === openId) ?? jobs.find((j) => j.visit.verifier.status === "en_route" || j.visit.verifier.status === "on_site");
  const offered = jobs.filter((j) => j.visit.verifier.status === "offered" && !declined.includes(j.visit.id));
  const done = jobs.filter((j) => j.visit.verifier.status === "reported" && !j.visit.verifier.simulated);
  const earned = done.reduce((sum, j) => sum + j.visit.verifier.fee, 0);
  const me = active?.visit.verifier.name ?? offered[0]?.visit.verifier.name ?? "Sanna M.";

  return (
    <VerifierShell>
      <section className="border-b border-ink bg-brand px-4 pt-6 pb-5 bay-lines-ink">
        <div className="flex items-center justify-between gap-2">
          <Tag tone="ink">Freelance verifier</Tag>
          <span className="text-sm text-ink/70">Vetted, ID checked</span>
        </div>
        <h1 className="mt-3 display-xl">Hi {me.split(" ")[0]}</h1>
        <dl className="mt-4 grid grid-cols-2 border border-ink bg-paper shadow-card">
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
        {active && active.visit.verifier.status !== "reported" ? (
          <ActiveJob key={active.visit.id} job={active} s={s} />
        ) : active ? (
          <Reported job={active} onClose={() => setOpenId(null)} />
        ) : (
          <>
            <section>
              <h2 className="mb-3 display-md">Spot checks near you</h2>
              {offered.length === 0 ? (
                <Card className="p-5">
                  <p className="font-medium">No visits nearby</p>
                  <a href="/demo" className="mt-1 inline-block py-2 tag-text text-ash-700 underline underline-offset-4" target="_blank" rel="noreferrer">Post one from the demo panel ↗</a>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {offered.map((j) => (
                    <li key={j.visit.id}>
                      <OfferCard job={j} onAccept={() => { actions.verifierAccept(j.visit.id); setOpenId(j.visit.id); }} onDecline={() => setDeclined((d) => [...d, j.visit.id])} />
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
                    <div key={j.visit.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span>
                        <span className="block font-medium">{j.dealer.name}</span>
                        <span className="block tag-text text-ash-700">
                          {timeFi(j.visit.verifier.reportedAt!)} · {j.cars.filter((c) => confirmed(j.visit.results[c.vin])).length} of {j.cars.length} found
                        </span>
                      </span>
                      <span className="figure text-lg">+{eur(j.visit.verifier.fee)}</span>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            <section>
              <p className="mb-2 tag-text text-ash-700">How visits work</p>
              <ul className="grid grid-cols-2 border border-ink bg-paper">
                {[["3–5 cars", "per visit"], ["~30 min", "on site"], ["Paid", "found or not"], ["Random", "unannounced"]].map(([k, sub], i) => (
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
  const { dealer, visit, cars } = job;
  // Fictional travel distance for the demo: verifiers are matched within the dealer's city.
  const km = 2 + (parseInt(visit.id.replace(/\D/g, "").slice(-2) || "4", 10) % 9);
  return (
    <Card className="animate-rise overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-ink bg-lime px-4 py-3">
        <div>
          <p className="tag-text">{dealer.city} · {km} km away</p>
          <p className="mt-1 display-md">{dealer.name}</p>
        </div>
        <span className="figure text-3xl">{eur(visit.verifier.fee)}</span>
      </div>
      <div className="px-4 py-3 text-sm">
        <p><b>{cars.length} cars</b> to confirm on the lot</p>
        <p className="mt-1 tag-text text-ash-700">~{10 + cars.length * 5} min · posted {timeFi(visit.verifier.dispatchedAt)}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-ink p-3">
        <Button arrow className="min-h-12" onClick={onAccept}>Accept visit</Button>
        <Button variant="secondary" className="min-h-12" onClick={onDecline}>Not now</Button>
      </div>
    </Card>
  );
}

function Steps({ status }: { status: SpotCheck["verifier"]["status"] }) {
  const idx = status === "en_route" ? 0 : status === "on_site" ? 1 : 2;
  return (
    <ol className="grid grid-cols-3 border border-ink tag-text">
      {(["Travel", "On site", "Report"] as const).map((l, i) => (
        <li key={l} className={`px-2 py-2 text-center ${i > 0 ? "border-l border-ink" : ""} ${i === idx ? "bg-ink text-paper" : i < idx ? "bg-lime" : "text-ash-500"}`}>
          {i < idx ? "✓ " : ""}{l}
        </li>
      ))}
    </ol>
  );
}

function ActiveJob({ job, s }: { job: Job; s: Store }) {
  const { visit, dealer, cars } = job;
  const v = visit.verifier;
  const [busy, setBusy] = useState(false);
  const [tooFar, setTooFar] = useState<number | null>(null);
  const [carVin, setCarVin] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const arrive = async () => {
    setBusy(true);
    setTooFar(null);
    try {
      const r = await actions.verifierArrive(visit.id, await getPosition());
      if (r && !r.inside) setTooFar(r.distanceM ?? -1);
    } finally {
      setBusy(false);
    }
  };

  const car = carVin ? cars.find((c) => c.vin === carVin) : undefined;
  if (car) return <CarCheck key={car.vin} visit={visit} dealer={dealer} car={car} s={s} onBack={() => setCarVin(null)} />;

  const allDone = cars.every((c) => visit.results[c.vin]);

  return (
    <div className="space-y-5">
      <Steps status={v.status} />

      <Card className="overflow-hidden">
        <div className="border-b border-ink bg-brand-soft px-5 py-4">
          <p className="tag-text text-ash-700">{dealer.city} · {cars.length} cars</p>
          <h2 className="mt-2 display-xl">{dealer.name}</h2>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div>
            <p className="tag-text text-ash-700">Your visit code</p>
            <p className="mt-1 font-mono text-2xl font-medium tracking-[0.15em]">{v.visitCode}</p>
          </div>
          <p className="max-w-[9rem] text-right text-xs text-ash-700">Staff see this code too</p>
        </div>
      </Card>

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
          <ul className="divide-y divide-ink border border-ink" aria-label="Cars to confirm">
            {cars.map((c) => {
              const r = visit.results[c.vin];
              const state = !r ? "todo" : r.status === "missing" ? "missing" : confirmed(r) ? "found" : "unconfirmed";
              return (
                <li key={c.vin}>
                  <button type="button" onClick={() => setCarVin(c.vin)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-brand-soft">
                    <span className={`flex size-8 shrink-0 items-center justify-center border border-ink text-sm ${state === "found" ? "bg-lime" : state === "todo" ? "bg-paper" : "bg-high text-ink"}`} aria-hidden>
                      {state === "found" ? "✓" : state === "todo" ? "" : "✗"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{c.make} {c.model}</span>
                      <span className="block tag-text text-ash-700">{c.color} · {c.plate}</span>
                    </span>
                    <span className="tag-text text-ash-700">{state === "todo" ? "Check" : state === "found" ? "Found" : state === "missing" ? "Not here" : "Retake"}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {allDone && (
            <>
              <label className="block">
                <span className="tag-text text-ash-700">Note for the lender (optional)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 block w-full border border-ink bg-paper p-3 text-sm" />
              </label>
              <Button arrow className="min-h-14 w-full text-base" onClick={() => { actions.verifierSubmit(visit.id, note || undefined); window.scrollTo({ top: 0 }); }}>
                Send report · get {eur(v.fee)}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CarCheck({ visit, dealer, car, s, onBack }: { visit: SpotCheck; dealer: Dealer; car: Car; s: Store; onBack: () => void }) {
  const existing = visit.results[car.vin];
  const [mode, setMode] = useState<"found" | "missing">(existing?.status === "missing" ? "missing" : "found");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reason, setReason] = useState<string | null>(existing?.status === "missing" ? existing.reason ?? null : null);
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
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="min-h-9 tag-text underline underline-offset-4">← All cars</button>

      <Card className="overflow-hidden">
        <div className="border-b border-ink bg-brand-soft px-5 py-4">
          <p className="tag-text text-ash-700">{dealer.name}</p>
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

      <div className="grid grid-cols-2 border border-ink" role="tablist" aria-label="Is the car here?">
        {([["found", "Car is here"], ["missing", "Car isn't here"]] as const).map(([k, l], i) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
            className={`min-h-12 px-2 text-sm font-medium ${i > 0 ? "border-l border-ink" : ""} ${mode === k ? "bg-ink text-paper" : "hover:bg-brand-soft"}`}>
            {l}
          </button>
        ))}
      </div>

      {mode === "found" ? (
        busy ? (
          <div className="flex min-h-28 items-center justify-center border border-ink bg-mist" role="status"><p className="font-medium">Checking the photos…</p></div>
        ) : photo ? (
          <div className="space-y-3">
            <div className={`flex items-center gap-3 border border-ink p-3 ${photo.verified ? "bg-lime" : "bg-mist"}`} role="status">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo.thumbnails?.car && <img src={photo.thumbnails.car} alt="" className="size-16 border border-ink object-cover" />}
              <div className="text-sm">
                <p className="font-medium">{photo.verified ? "Car matches ✓" : "Couldn't confirm the car"}</p>
                {photo.odometer?.readKm != null && <p className="font-mono text-ash-700">{photo.odometer.readKm.toLocaleString("en")} km</p>}
                {!photo.verified && <p className="text-ash-700">Closer, no glare.</p>}
                <button type="button" className="mt-1 min-h-8 underline underline-offset-4" onClick={() => actions.verifierCar(visit.id, car.vin, null)}>Retake</button>
              </div>
            </div>
            <Button arrow className="min-h-14 w-full text-base" onClick={onBack}>Back to the list</Button>
          </div>
        ) : (
          <>
            {failed && <p className="border border-ink bg-mist p-3 text-sm" role="status">Couldn&apos;t send the photos. Retake.</p>}
            <ShotSequence key={attempt} car={car} allowDemo={s.flags.demoCamera} onDone={onShots} />
          </>
        )
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
          <Button arrow className="mt-4 min-h-14 w-full text-base" disabled={!reason} onClick={() => { actions.verifierCar(visit.id, car.vin, { status: "missing", reason: reason ?? undefined }); onBack(); }}>
            Mark as not here
          </Button>
        </fieldset>
      )}
    </div>
  );
}

function Reported({ job, onClose }: { job: Job; onClose: () => void }) {
  const { visit, cars } = job;
  const found = cars.filter((c) => confirmed(visit.results[c.vin])).length;
  return (
    <div className="animate-rise space-y-4" role="status">
      <Steps status="reported" />
      <div className="flex items-center gap-4 border border-ink bg-lime p-4">
        <span className="flex size-12 shrink-0 items-center justify-center bg-ink text-lime" aria-hidden>
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>
        </span>
        <div>
          <p className="display-md">Report sent</p>
          <p className="text-sm">{found} of {cars.length} found · +{eur(visit.verifier.fee)}</p>
        </div>
      </div>
      <Button arrow className="min-h-12 w-full" onClick={onClose}>Back to visits</Button>
    </div>
  );
}
