"use client";
import type { Store } from "@/lib/store";
import { CONFIRMED_DAYS, portfolioStats } from "@/lib/risk";
import { businessCase, type BusinessCase } from "@/lib/businessCase";
import { eur, eurCompact } from "@/lib/format";
import { ASSUMPTIONS } from "@/config/assumptions";
import { isOpen } from "./shared";
import { Odometer } from "@/components/ui/Odometer";
import { useEffect, useId, useRef, useState } from "react";

export function Headline({ s, onAlerts }: { s: Store; onAlerts: () => void }) {
  const stats = s.dealers.map((d) => portfolioStats(s, d.id));
  const cars = stats.reduce((n, x) => n + x.cars.length, 0);
  const exposure = stats.reduce((n, x) => n + x.financedTotal, 0);
  const confirmedValue = stats.reduce((n, x) => n + x.confirmedValue, 0);
  const confirmedCars = stats.reduce((n, x) => n + x.confirmed.length, 0);
  const open = s.alerts.filter(isOpen);
  const bySev = (sev: string) => open.filter((a) => a.severity === sev).length;
  const bc = businessCase(s.dealers.map((d) => d.tier));
  const share = exposure ? confirmedValue / exposure : 0;
  // The bar fills on first paint, then follows live changes.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(share));
    return () => cancelAnimationFrame(id);
  }, [share]);

  return (
    <section aria-label="Portfolio headline" className="grid md:grid-cols-12">
      <div className="py-6 md:col-span-5 md:py-8 md:pr-8">
        <p className="tag-text text-ash-700">Collateral confirmed, last {CONFIRMED_DAYS} days</p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
          <Odometer value={`${Math.round(share * 100)}%`} ms={1200} className="figure text-[clamp(2.75rem,5.5vw,5rem)]" />
          <span className="figure text-[clamp(1.2rem,1.8vw,1.6rem)] text-ash-500">{eurCompact(confirmedValue)} of {eurCompact(exposure)}</span>
        </p>
        <div className="mt-5 h-3 border border-ink" role="img" aria-label={`${Math.round(share * 100)}% of financed value confirmed on the lot in the last ${CONFIRMED_DAYS} days`}>
          <div className="h-full bg-ink transition-[width] duration-1000" style={{ width: `${shown * 100}%` }} />
        </div>
        <p className="mt-3 text-sm text-ash-700">{confirmedCars.toLocaleString("en")} cars seen on the lot by a self-check or spot check</p>
      </div>

      <div className="grid grid-cols-2 border-t border-ink md:col-span-7 md:grid-cols-3 md:border-t-0">
        <Stat label="Cars financed" value={cars} sub={<Parts items={[eurCompact(exposure), `${s.dealers.length} dealers`]} />} />
        <button type="button" onClick={onAlerts} className="group flex flex-col items-start border-l border-ink py-6 pl-4 text-left transition-colors hover:bg-mist focus-visible:outline-offset-[-2px] md:py-8 md:pl-6">
          <p className="tag-text text-ash-700">Open alerts <span aria-hidden className="inline-block transition-transform group-hover:translate-y-0.5">↓</span></p>
          <p className="mt-3 figure text-[clamp(2rem,3.2vw,3rem)]">
            <Odometer value={open.length} />
            {open.length > 0 && <span className="ml-2 inline-block size-3 animate-pulse-dot bg-high align-middle" aria-hidden />}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums text-ash-700">
            <SevCount n={bySev("high")} cls="bg-high" label="high" />
            <SevCount n={bySev("medium")} cls="bg-medium" label="medium" />
            <SevCount n={bySev("low")} cls="bg-low" label="low" />
          </p>
        </button>
        <div className="relative col-span-2 border-t border-ink py-6 md:col-span-1 md:border-t-0 md:border-l md:py-8 md:pl-6">
          <p className="flex items-center justify-between gap-2"><span className="tag-text text-ash-700">Cost vs today</span><CostInfo bc={bc} /></p>
          <p className="mt-3 figure text-[clamp(2rem,3.2vw,3rem)]"><Odometer value={`−${bc.savingPct}%`} ms={1200} /></p>
          <p className="mt-3 text-sm text-ash-700"><Parts items={[`${eurCompact(bc.total)} vs ${eurCompact(bc.today)} a year`, `−${bc.freelanceSavingPct}% with local verifiers`]} /></p>
        </div>
      </div>
    </section>
  );
}

/** One phrase per line, so nothing breaks mid-phrase or leaves a dangling separator. */
const Parts = ({ items }: { items: string[] }) => (
  <>{items.map((t) => <span key={t} className="block">{t}</span>)}</>
);

function Stat({ label, value, sub }: { label: string; value: number; sub: React.ReactNode }) {
  return (
    <div className="py-6 pr-4 md:border-l md:border-ink md:py-8 md:pl-6">
      <p className="tag-text text-ash-700">{label}</p>
      <p className="mt-3 figure text-[clamp(2rem,3.2vw,3rem)]"><Odometer value={value} /></p>
      <p className="mt-3 text-sm text-ash-700">{sub}</p>
    </div>
  );
}

function SevCount({ n, cls, label }: { n: number; cls: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${n ? `text-ink ${label === "high" ? "font-semibold" : ""}` : ""}`}>
      <span className={`inline-block size-2 ${cls}`} aria-hidden />
      {n} {label}
    </span>
  );
}

/** "?" next to the cost tile: the business case behind the headline, in a few lines. */
function CostInfo({ bc }: { bc: BusinessCase }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span ref={ref} className="-my-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="How this is calculated"
        onClick={() => setOpen((o) => !o)}
        className={`flex size-8 items-center justify-center text-xs font-semibold transition-colors ${open ? "text-ink" : "text-ash-700 hover:text-ink"}`}
      >
        <span className={`flex size-[18px] items-center justify-center border ${open ? "border-ink bg-ink text-paper" : "border-ash-500"}`} aria-hidden>?</span>
      </button>
      {open && (
        <span id={id} role="dialog" aria-label="How this is calculated" className="absolute top-14 right-0 z-20 block w-[min(20rem,calc(100vw-2rem))] border border-ink bg-paper p-4 text-left text-sm leading-snug animate-rise">
          <span className="block tag-text text-ash-700">A year, whole portfolio · assumptions</span>
          <span className="mt-3 block"><b className="font-semibold">Today</b> {ASSUMPTIONS.inPersonChecksToday.toLocaleString("en")} car checks × {eur(ASSUMPTIONS.auditorVisitCost)} = {eur(bc.today)}</span>
          <span className="mt-2 block"><b className="font-semibold">Floor Check</b> self-checks, spot checks, full counts, data, AI and maintenance = {eur(bc.total)}</span>
          <span className="mt-2 block border-t border-line pt-2">{bc.inPersonCarChecks.toLocaleString("en")} in-person car checks instead of {ASSUMPTIONS.inPersonChecksToday.toLocaleString("en")}. Details in the business case below.</span>
        </span>
      )}
    </span>
  );
}
