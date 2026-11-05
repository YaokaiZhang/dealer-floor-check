"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Lot, demoLot, type Stall } from "@/components/ui/Lot";
import { actions, type Store } from "@/lib/store";
import { getPosition } from "@/lib/verify";
import { formatDistance } from "@/lib/geo";
import { eur } from "@/lib/format";
import { CarCheck } from "./CarCheck";
import { carState, Plate, STATE_LABEL, StateMark, Swatch, type CarState, type Job } from "./shared";

/** Bottom bar for the one next action, within thumb reach. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 z-10 mt-auto border-t border-line bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>;
}

/** The lot ahead: rows of unknown cars, with this visit's cars outlined somewhere among them. */
function travelLot(n: number): Stall[] {
  const lot = demoLot(40, { unknown: 0.8, empty: 0.2 }, 11);
  [7, 22, 34, 15, 28].slice(0, n).forEach((i) => { lot[i] = "visit"; });
  return lot;
}

const SEGMENT: Record<CarState, string> = { todo: "bg-paper", found: "bg-lime", missing: "bg-ink", unconfirmed: "bg-high" };

function VisitHeader({ job }: { job: Job }) {
  const { visit, dealer, cars } = job;
  const onSite = visit.verifier.status === "on_site";
  const states = cars.map((c) => carState(visit.results[c.vin]));
  const checked = states.filter((s) => s !== "todo").length;
  return (
    <section className="border-b border-line bg-brand px-4 pt-5 pb-4 bay-lines-ink">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink/70">{dealer.city}</p>
          <h1 className="mt-1 display-lg">{dealer.name}</h1>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-ink/70">Visit code</p>
          <p className="mt-1 border border-line bg-paper px-2 py-1 font-mono text-lg font-medium tracking-[0.12em]">{visit.verifier.visitCode}</p>
        </div>
      </div>
      {onSite ? (
        <div className="mt-4 flex items-center gap-3">
          <ol className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${cars.length}, 1fr)` }} aria-hidden>
            {states.map((s, i) => <li key={i} className={`h-2.5 border border-line transition-colors duration-300 ${SEGMENT[s]}`} />)}
          </ol>
          <p className="shrink-0 text-sm font-medium tabular-nums">{checked} of {cars.length} checked</p>
        </div>
      ) : (
        <p className="mt-4 text-sm">Staff see this code too.</p>
      )}
    </section>
  );
}

export function ActiveVisit({ job, s }: { job: Job; s: Store }) {
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

  const openCar = (vin: string | null) => {
    setCarVin(vin);
    window.scrollTo({ top: 0 });
  };

  const states = cars.map((c) => carState(visit.results[c.vin]));
  const next = cars.find((c, i) => states[i] === "todo" && c.vin !== carVin);

  const car = carVin ? cars.find((c) => c.vin === carVin) : undefined;
  if (car) return <CarCheck key={car.vin} visit={visit} dealer={dealer} car={car} s={s} next={next} onNext={openCar} onBack={() => openCar(null)} />;
  const retakes = states.filter((x) => x === "unconfirmed").length;

  if (v.status === "en_route") {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        <VisitHeader job={job} />
        <div className="space-y-5 px-4 pt-6 pb-8">
          <Lot stalls={travelLot(cars.length)} cols={10} className="mx-auto w-full max-w-[260px] text-ink" />
          <p className="text-lg leading-snug">{cars.length} cars to photograph. You get <b>{eur(v.fee)}</b> when you send the report, found or not.</p>
          {tooFar !== null && (
            <p className="border border-line bg-high-soft p-3 text-sm" role="status">
              {tooFar < 0 ? "No location. Allow location access and try again." : <>You&apos;re <b>{formatDistance(tooFar)}</b> from the lot. Get closer and try again.</>}
            </p>
          )}
        </div>
        <ActionBar>
          <Button arrow className="min-h-14 w-full text-base" disabled={busy} onClick={arrive}>{busy ? "Checking location…" : "I'm at the lot"}</Button>
        </ActionBar>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <VisitHeader job={job} />
      <ul className="divide-y divide-line border-b border-line" aria-label="Cars to confirm">
        {cars.map((c, i) => {
          const st = states[i];
          const done = st === "found" || st === "missing";
          return (
            <li key={c.vin}>
              <button type="button" onClick={() => openCar(c.vin)} className="flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-soft active:bg-brand-soft">
                <StateMark state={st} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-base font-medium ${done ? "text-ash-700" : ""}`}>{c.make} {c.model}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-sm text-ash-700">
                    <Swatch color={c.color} />
                    <span className="truncate">{c.color}</span>
                    <span className="ml-1.5 font-mono text-xs whitespace-nowrap">VIN …{c.vin.slice(-6)}</span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <Plate plate={c.plate} />
                  <span className={`tag-text ${st === "todo" || st === "unconfirmed" ? "font-semibold text-ink" : "text-ash-700"}`}>{STATE_LABEL[st]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!next && (
        <label className="block px-4 pt-5 pb-6">
          <span className="text-sm text-ash-700">Note for the lender (optional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1.5 block w-full border border-line bg-paper p-3 text-base" />
        </label>
      )}

      <ActionBar>
        {next ? (
          <Button arrow className="min-h-14 w-full text-base" onClick={() => openCar(next.vin)}>
            <span className="min-w-0 truncate">Next: {next.make} {next.model}</span>
            <span className="shrink-0 border border-paper/60 px-1.5 py-0.5 font-mono text-sm tracking-wider">{next.plate}</span>
          </Button>
        ) : (
          <>
            {retakes > 0 && <p className="mb-2 text-sm">{retakes === 1 ? "1 car" : `${retakes} cars`} couldn&apos;t be confirmed. Retake, or send as is.</p>}
            <Button arrow className="min-h-14 w-full text-base" onClick={() => { actions.verifierSubmit(visit.id, note || undefined); window.scrollTo({ top: 0 }); }}>
              Send report <span className="figure text-lg">{eur(v.fee)}</span>
            </Button>
          </>
        )}
      </ActionBar>
    </div>
  );
}
