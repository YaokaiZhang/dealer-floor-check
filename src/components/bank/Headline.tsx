"use client";
import type { Store } from "@/lib/store";
import { portfolioStats } from "@/lib/risk";
import { headline } from "@/lib/costModel";
import { eurCompact } from "@/lib/format";
import { isOpen } from "./shared";

export function Headline({ s, onAlerts }: { s: Store; onAlerts: () => void }) {
  const stats = s.dealers.map((d) => portfolioStats(s, d.id));
  const cars = stats.reduce((n, x) => n + x.cars.length, 0);
  const exposure = stats.reduce((n, x) => n + x.financedTotal, 0);
  const auto = stats.reduce((n, x) => n + x.autoVerified.length, 0);
  const open = s.alerts.filter(isOpen);
  const bySev = (sev: string) => open.filter((a) => a.severity === sev).length;
  const h = headline();
  const autoPct = cars ? auto / cars : 0;

  return (
    <section aria-label="Portfolio headline" className="grid border border-ink bg-paper shadow-card md:grid-cols-12">
      {/* Auto-verified: the one figure to look at */}
      <div className="relative border-b border-ink bg-lime p-5 md:col-span-5 md:border-r md:border-b-0 md:p-7">
        <p className="tag-text">Verified automatically today</p>
        <p className="mt-3 flex items-baseline gap-3">
          <span className="figure text-[clamp(3.5rem,8vw,6.5rem)]">{auto}</span>
          <span className="figure text-[clamp(1.6rem,3vw,2.6rem)] text-ink/60">of {cars} cars</span>
        </p>
        <div className="mt-4 h-2 border border-ink bg-paper" aria-hidden>
          <div className="h-full bg-ink transition-[width] duration-700" style={{ width: `${autoPct * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:col-span-7 md:grid-cols-3">
        <Stat label="Cars financed" value={String(cars)} sub={<Parts items={[`${eurCompact(exposure)} exposure`, `${s.dealers.length} dealers`]} />} />
        <button type="button" onClick={onAlerts} className="border-l border-ink p-5 text-left transition-colors hover:bg-mist md:p-7">
          <p className="tag-text text-ash-700">Open alerts</p>
          <p className="mt-3 figure text-[clamp(2.6rem,5vw,4rem)]">
            {open.length}
            {open.length > 0 && <span className="ml-2 inline-block size-3 animate-pulse-dot bg-high align-middle" aria-hidden />}
          </p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ash-700">
            <SevCount n={bySev("high")} cls="bg-high" label="high" />
            <SevCount n={bySev("medium")} cls="bg-medium" label="medium" />
            <SevCount n={bySev("low")} cls="bg-low" label="low" />
          </p>
        </button>
        <div className="col-span-2 border-t border-ink bg-brand p-5 md:col-span-1 md:border-t-0 md:border-l md:p-7">
          <p className="tag-text">Floor-check cost</p>
          <p className="mt-3 figure text-[clamp(2.6rem,5vw,4rem)]">−{h.checkCostReductionPct}%</p>
          <p className="mt-2 text-sm"><Parts items={[`−${h.fraudLossReductionPct}% fraud loss`, `${eurCompact(h.portfolioSavings)}/yr`]} /></p>
        </div>
      </div>
    </section>
  );
}

/** One phrase per line, so nothing breaks mid-phrase or leaves a dangling separator. */
const Parts = ({ items }: { items: string[] }) => (
  <>{items.map((t) => <span key={t} className="block">{t}</span>)}</>
);

function Stat({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="p-5 md:p-7">
      <p className="tag-text text-ash-700">{label}</p>
      <p className="mt-3 figure text-[clamp(2.6rem,5vw,4rem)]">{value}</p>
      <p className="mt-2 text-sm text-ash-700">{sub}</p>
    </div>
  );
}

function SevCount({ n, cls, label }: { n: number; cls: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${n ? "text-ink" : ""}`}>
      <span className={`inline-block size-2 ${cls}`} aria-hidden />
      {n} {label}
    </span>
  );
}
