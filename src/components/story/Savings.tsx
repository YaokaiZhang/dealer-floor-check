"use client";
import type { BusinessCase } from "@/lib/businessCase";
import { ASSUMPTIONS } from "@/config/assumptions";
import { ease, span } from "./Scene";

/**
 * Chapter 8: the business case for a year across the portfolio, worst case. Today's bar draws out,
 * then Floor Check's much shorter one with its two cost lines, then the reduction counts up.
 * Same numbers as the bank's business case (src/lib/businessCase.ts).
 */

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-US")}`;

function Bar({ label, value, max, grow, fill, children }: { label: string; value: number; max: number; grow: number; fill: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-medium">{label}</p>
        <p className="figure text-[clamp(1.4rem,2.6vw,2.2rem)]">{eur(value * grow)}</p>
      </div>
      <div className="mt-3 h-12 w-full border border-ink md:h-16" aria-hidden>
        <div className={`h-full ${fill}`} style={{ width: `${(value / max) * grow * 100}%` }} />
      </div>
      <div className="mt-2 text-sm text-ash-700">{children}</div>
    </div>
  );
}

export function Savings({ p, bc }: { p: number; bc: BusinessCase }) {
  const a = ease(span(p, 0.05, 0.3));
  const b = ease(span(p, 0.32, 0.6));
  const n = ease(span(p, 0.62, 0.88));
  const [physical, phone] = bc.rows;
  return (
    <div
      className="relative flex h-full w-full flex-col justify-center gap-8 md:gap-12"
      role="img"
      aria-label={`A year across the portfolio, worst case: today ${eur(bc.today)}, with Floor Check ${eur(bc.total)}. ${bc.savingPct}% lower cost, ${eur(bc.saved)} saved every year.`}
    >
      <div className="flex flex-col gap-6 md:gap-8" aria-hidden>
        <Bar label="Today" value={bc.today} max={bc.today} grow={a} fill="bg-high">
          {ASSUMPTIONS.portfolioCars.toLocaleString("en")} cars × €{ASSUMPTIONS.auditorVisitCost}: one physical inspection per car a year
        </Bar>
        <Bar label="With Floor Check" value={bc.total} max={bc.today} grow={b} fill="bg-go">
          <p><b className="font-semibold text-ink">{physical.item} {eur(physical.cost)}:</b> {physical.volume}</p>
          <p><b className="font-semibold text-ink">{phone.item} {eur(phone.cost)}:</b> {phone.volume}</p>
        </Bar>
      </div>
      <div className="border-t border-ink pt-3" style={{ opacity: 0.15 + 0.85 * n }} aria-hidden>
        <p className="figure text-[clamp(2.4rem,6vw,5.5rem)]">−{Math.round(bc.savingPct * n)}%</p>
        <p className="mt-2 text-sm text-ash-700">Lower cost · {eur(bc.saved)} saved every year</p>
      </div>
    </div>
  );
}
