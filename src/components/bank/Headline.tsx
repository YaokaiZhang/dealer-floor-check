"use client";
import type { Store } from "@/lib/store";
import { portfolioStats } from "@/lib/risk";
import { headline } from "@/lib/costModel";
import { eur, eurCompact } from "@/lib/format";
import { ASSUMPTIONS } from "@/config/assumptions";
import { isOpen } from "./shared";
import { Odometer } from "@/components/ui/Odometer";
import { useEffect, useId, useRef, useState } from "react";

export function Headline({ s, onAlerts }: { s: Store; onAlerts: () => void }) {
  const stats = s.dealers.map((d) => portfolioStats(s, d.id));
  const cars = stats.reduce((n, x) => n + x.cars.length, 0);
  const exposure = stats.reduce((n, x) => n + x.financedTotal, 0);
  const auto = stats.reduce((n, x) => n + x.autoVerified.length, 0);
  const open = s.alerts.filter(isOpen);
  const bySev = (sev: string) => open.filter((a) => a.severity === sev).length;
  const h = headline();
  const autoPct = cars ? auto / cars : 0;
  // Tiles fill in order on first paint, then follow live changes.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(auto));
    return () => cancelAnimationFrame(id);
  }, [auto]);

  return (
    <section aria-label="Portfolio headline" className="grid md:grid-cols-12">
      <div className="py-6 md:col-span-5 md:py-8 md:pr-8">
        <p className="tag-text text-ash-700">Verified automatically today</p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
          <Odometer value={auto} ms={1200} className="figure text-[clamp(3.5rem,7vw,6.5rem)]" />
          <span className="figure text-[clamp(1.4rem,2.2vw,2rem)] text-ash-500">of {cars}</span>
        </p>
        {/* One tile per financed car, seen from above: filled = verified by data today */}
        <div className="mt-5 hidden flex-wrap gap-[3px] sm:flex" role="img" aria-label={`${auto} of ${cars} cars verified automatically`}>
          {Array.from({ length: cars }, (_, i) => (
            <span
              key={i}
              className={`h-[11px] w-[6px] border transition-colors duration-300 ${i < shown ? "border-ink bg-ink" : "border-ash-300"}`}
              style={{ transitionDelay: `${i * 9}ms` }}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-ash-700">{Math.round(autoPct * 100)}% need no photo today</p>
      </div>

      <div className="grid grid-cols-2 border-t border-ink md:col-span-7 md:grid-cols-3 md:border-t-0">
        <Stat label="Cars financed" value={cars} sub={<Parts items={[eurCompact(exposure), `${s.dealers.length} dealers`]} />} />
        <button type="button" onClick={onAlerts} className="group flex flex-col items-start border-l border-ink py-6 pl-4 text-left transition-colors hover:bg-mist focus-visible:outline-offset-[-2px] md:py-8 md:pl-6">
          <p className="tag-text text-ash-700">Open alerts <span aria-hidden className="inline-block transition-transform group-hover:translate-y-0.5">↓</span></p>
          <p className="mt-3 figure text-[clamp(2.5rem,4vw,3.75rem)]">
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
          <p className="flex items-center justify-between gap-2"><span className="tag-text text-ash-700">Check cost vs traditional</span><CostInfo h={h} /></p>
          <p className="mt-3 figure text-[clamp(2.5rem,4vw,3.75rem)]"><Odometer value={`−${h.checkCostReductionPct}%`} ms={1200} /></p>
          <p className="mt-3 text-sm text-ash-700"><Parts items={[`−${h.fraudLossReductionPct}% fraud loss`, `${eurCompact(h.portfolioSavings)} a year`]} /></p>
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
      <p className="mt-3 figure text-[clamp(2.5rem,4vw,3.75rem)]"><Odometer value={value} /></p>
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

/** "?" next to the cost tile: the model behind the headline numbers, in four lines. */
function CostInfo({ h }: { h: ReturnType<typeof headline> }) {
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
  const t = h.traditional, s = h.signals;
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
          <span className="block tag-text text-ash-700">Per dealer per year, model</span>
          <span className="mt-3 block"><b className="font-semibold">Traditional</b> {t.f} visits × {eur(ASSUMPTIONS.auditorVisitCost)} = {eur(t.checkCost)}. Found in ~{Math.round(t.detectionDays)} days, {eur(t.fraudLoss)} lost.</span>
          <span className="mt-2 block"><b className="font-semibold">Curb</b> check-ins, spot checks, data feeds = {eur(s.checkCost)}. Found in ~{Math.round(s.detectionDays)} days, {eur(s.fraudLoss)} lost.</span>
          <span className="mt-2 block border-t border-line pt-2">{eur(t.total - s.total)} × {ASSUMPTIONS.portfolioDealers} dealers = {eurCompact(h.portfolioSavings)} a year</span>
        </span>
      )}
    </span>
  );
}
