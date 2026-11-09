"use client";
import { headline } from "@/lib/costModel";
import { ASSUMPTIONS } from "@/config/assumptions";
import { ease, span } from "./Scene";

const H = headline();
const today = H.traditional;
const curb = H.signals;
const MAX = today.total;

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-US")}`;

/** One cost bar: checks (solid) then expected fraud loss (hatched), drawn out to `grow`. */
function Bar({ label, checks, fraud, grow, note }: { label: string; checks: number; fraud: number; grow: number; note: string }) {
  const total = (checks + fraud) * grow;
  const c = Math.min(checks, total), f = Math.max(0, total - checks);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-medium">{label}</p>
        <p className="figure text-[clamp(1.4rem,2.6vw,2.2rem)]">{eur(total)}</p>
      </div>
      <div className="mt-3 flex h-12 w-full border border-ink md:h-16" aria-hidden>
        <div className="h-full bg-ink" style={{ width: `${(c / MAX) * 100}%` }} />
        <div className="savings-hatch h-full" style={{ width: `${(f / MAX) * 100}%` }} />
      </div>
      <p className="mt-2 text-sm text-ash-700">{note}</p>
    </div>
  );
}

function Figure({ value, label, t }: { value: number; label: string; t: number }) {
  return (
    <div className="border-t border-ink pt-3" style={{ opacity: 0.15 + 0.85 * t }}>
      <p className="figure text-[clamp(2.4rem,6vw,5.5rem)]">−{Math.round(value * t)}%</p>
      <p className="mt-2 text-sm text-ash-700">{label}</p>
    </div>
  );
}

export function Savings({ p }: { p: number }) {
  const a = ease(span(p, 0.05, 0.3));
  const b = ease(span(p, 0.32, 0.6));
  const n = ease(span(p, 0.62, 0.88));
  return (
    <div
      className="relative flex h-full w-full flex-col justify-center gap-8 md:gap-12"
      role="img"
      aria-label={`Per dealer and year: manual floor checks ${eur(today.total)}, Curb ${eur(curb.total)}. Check cost down ${H.checkCostReductionPct}%, expected fraud loss down ${H.fraudLossReductionPct}%.`}
    >
      <div className="flex flex-col gap-6 md:gap-8">
        <Bar label="Manual floor checks" checks={today.checkCost} fraud={today.fraudLoss} grow={a} note={`${today.f} in-person car checks, a missed sale found after ${Math.round(today.detectionDays)} days`} />
        <Bar label="Curb" checks={curb.checkCost} fraud={curb.fraudLoss} grow={b} note={`Data, self-checks, €${ASSUMPTIONS.gigCheckCost}-a-car spot checks, AI and upkeep, found after ${Math.round(curb.detectionDays)} days`} />
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ash-700" aria-hidden>
          <span className="flex items-center gap-2"><span className="inline-block size-3 bg-ink" />Cost of checks</span>
          <span className="flex items-center gap-2"><span className="savings-hatch inline-block size-3 border border-ink" />Expected fraud loss</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:gap-8" aria-hidden>
        <Figure value={H.checkCostReductionPct} label="Cost of checks" t={n} />
        <Figure value={H.fraudLossReductionPct} label="Expected fraud loss" t={n} />
      </div>
    </div>
  );
}
