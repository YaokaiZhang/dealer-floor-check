"use client";
import type { Store } from "@/lib/store";
import { portfolioStats } from "@/lib/risk";
import { headline } from "@/lib/costModel";
import { eurCompact } from "@/lib/format";
import { isOpen } from "./shared";
import { Odometer } from "@/components/ui/Odometer";
import { useEffect, useState } from "react";

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
    <section aria-label="Portfolio headline" className="grid border border-ink bg-paper md:grid-cols-12">
      {/* Auto-verified: the one figure to look at */}
      <div className="relative overflow-hidden border-b border-ink bg-lime p-4 sm:p-5 md:col-span-5 md:border-r md:border-b-0 md:px-6">
        <p className="tag-text">Verified automatically today</p>
        <p className="mt-2 flex items-baseline gap-3">
          <Odometer value={auto} ms={1200} className="figure text-[clamp(3rem,5.5vw,4.75rem)]" />
          <span className="figure text-[clamp(1.4rem,2.2vw,2rem)] text-ink/60">of {cars} cars</span>
        </p>
        {/* One tile per financed car, seen from above: filled = verified by data today */}
        <div className="mt-4 hidden flex-wrap gap-[3px] sm:flex" role="img" aria-label={`${auto} of ${cars} cars verified automatically`}>
          {Array.from({ length: cars }, (_, i) => (
            <span
              key={i}
              className={`h-[11px] w-[6px] rounded-[2px] border transition-colors duration-300 ${i < shown ? "border-ink bg-ink" : "border-ink/25"}`}
              style={{ transitionDelay: `${i * 9}ms` }}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-ink/75">{Math.round(autoPct * 100)}% need no photo today</p>
      </div>

      <div className="grid grid-cols-2 md:col-span-7 md:grid-cols-3">
        <Stat label="Cars financed" value={cars} sub={<Parts items={[`${eurCompact(exposure)} exposure`, `${s.dealers.length} dealers`]} />} />
        <button type="button" onClick={onAlerts} className="group border-l border-ink p-4 sm:p-5 text-left transition-colors hover:bg-mist md:px-6">
          <p className="tag-text text-ash-700">Open alerts <span aria-hidden className="inline-block transition-transform group-hover:translate-y-0.5">↓</span></p>
          <p className="mt-2 figure text-[clamp(2.25rem,3.6vw,3.25rem)]">
            <Odometer value={open.length} />
            {open.length > 0 && <span className="ml-2 inline-block size-3 animate-pulse-dot bg-high align-middle" aria-hidden />}
          </p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums text-ash-700">
            <SevCount n={bySev("high")} cls="bg-high" label="high" />
            <SevCount n={bySev("medium")} cls="bg-medium" label="medium" />
            <SevCount n={bySev("low")} cls="bg-low" label="low" />
          </p>
        </button>
        <div className="col-span-2 border-t border-ink bg-brand p-4 sm:p-5 md:col-span-1 md:border-t-0 md:border-l md:px-6">
          <p className="tag-text">Floor-check cost</p>
          <p className="mt-2 figure text-[clamp(2.25rem,3.6vw,3.25rem)]"><Odometer value={`−${h.checkCostReductionPct}%`} ms={1200} /></p>
          <p className="mt-2 text-sm"><Parts items={[`vs traditional checks`, `−${h.fraudLossReductionPct}% fraud loss, ${eurCompact(h.portfolioSavings)}/yr (model)`]} /></p>
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
    <div className="p-4 sm:p-5 md:px-6">
      <p className="tag-text text-ash-700">{label}</p>
      <p className="mt-2 figure text-[clamp(2.25rem,3.6vw,3.25rem)]"><Odometer value={value} /></p>
      <p className="mt-2 text-sm text-ash-700">{sub}</p>
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
