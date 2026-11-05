"use client";
import { Fragment, useState } from "react";
import type { Store } from "@/lib/store";
import type { Dealer, Severity } from "@/lib/types";
import { portfolioStats, riskScore } from "@/lib/risk";
import { eurCompact } from "@/lib/format";
import { TierBadge } from "@/components/ui/TierBadge";
import { Odometer } from "@/components/ui/Odometer";

export const riskTone = (score: number) => (score >= 60 ? "bg-high" : score >= 35 ? "bg-medium" : "bg-lime");
export const riskWord = (score: number) => (score >= 60 ? "Act now" : score >= 35 ? "Watch" : "Low");

const SEV: Severity[] = ["high", "medium", "low"];
const SEV_CHIP: Record<Severity, string> = { high: "bg-high text-paper", medium: "bg-medium-soft", low: "bg-low-soft" };

/** Dealers as one ledger, riskiest first, so the eye lands on the row that needs action. */
export function Portfolio({ s, onOpen }: { s: Store; onOpen: (id: string) => void }) {
  const rows = s.dealers
    .map((d) => ({ d, st: portfolioStats(s, d.id), risk: riskScore(s, d) }))
    .sort((a, b) => b.risk.score - a.risk.score || a.d.name.localeCompare(b.d.name));

  return (
    <div className="border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Dealers, sorted by risk score, highest first. Select a dealer to open details.</caption>
        <thead className="border-b border-line bg-mist text-xs whitespace-nowrap text-ash-700">
          <tr>
            <th scope="col" className="py-2 pr-2 pl-4 font-normal">Dealer</th>
            <th scope="col" className="px-2 py-2 font-normal" aria-sort="descending">Risk <span aria-hidden>↓</span></th>
            <th scope="col" className="px-2 py-2 font-normal">Open alerts</th>
            <th scope="col" className="hidden px-2 py-2 text-right font-normal sm:table-cell">Financed</th>
            <th scope="col" className="hidden px-2 py-2 text-right font-normal xl:table-cell">Credit used</th>
            <th scope="col" className="hidden px-2 py-2 font-normal md:table-cell lg:hidden xl:table-cell">Auto-verified</th>
            <th scope="col" className="w-10 py-2 pr-2 font-normal"><span className="sr-only">Risk breakdown</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <DealerRow key={r.d.id} {...r} onOpen={() => onOpen(r.d.id)} />
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-2 text-xs text-ash-700">Risk 0–100 from alerts, check-in record and connected share. Watch from 35, act from 60.</p>
    </div>
  );
}

function DealerRow({ d, st, risk, onOpen }: { d: Dealer; st: ReturnType<typeof portfolioStats>; risk: ReturnType<typeof riskScore>; onOpen: () => void }) {
  const [why, setWhy] = useState(false);
  const autoPct = st.cars.length ? st.autoVerified.length / st.cars.length : 0;
  const used = d.creditLine ? st.financedTotal / d.creditLine : 0;
  const sev = (k: Severity) => st.openAlerts.filter((a) => a.severity === k).length;
  const breakdownId = `why-${d.id}`;

  return (
    <Fragment>
      <tr onClick={onOpen} className={`group cursor-pointer align-middle transition-colors hover:bg-mist ${why ? "" : "border-b border-line last:border-b-0"}`}>
        <td className="py-3 pr-2 pl-4">
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="block text-left focus-visible:outline-offset-4" aria-label={`Open ${d.name}`}>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-base font-semibold leading-tight underline-offset-4 group-hover:underline">{d.name}</span>
              <TierBadge tier={d.tier} />
            </span>
            <span className="mt-0.5 block text-xs text-ash-700">
              {d.city}
              <span className="sm:hidden">, {st.cars.length} cars, {eurCompact(st.financedTotal)}</span>
            </span>
          </button>
        </td>
        <td className="px-2 py-3">
          <span className="flex items-center gap-3">
            <Odometer value={risk.score} className="figure min-w-[2ch] text-3xl" />
            <span className="hidden min-w-0 flex-col gap-1 sm:flex">
              <span className="relative block h-1.5 w-20 bg-ash-100" aria-hidden>
                <span className={`absolute inset-y-0 left-0 ${riskTone(risk.score)} transition-[width] duration-500`} style={{ width: `${risk.score}%` }} />
                {/* band edges: watch from 35, act from 60 */}
                <span className="absolute -top-0.5 left-[35%] h-2.5 w-px bg-ash-500" />
                <span className="absolute -top-0.5 left-[60%] h-2.5 w-px bg-ash-500" />
              </span>
              <span className={`text-xs ${risk.score >= 60 ? "font-semibold" : "text-ash-700"}`}>{riskWord(risk.score)}</span>
            </span>
          </span>
        </td>
        <td className="px-2 py-3">
          {st.openAlerts.length ? (
            <span className="flex flex-wrap items-center gap-1" aria-label={`${st.openAlerts.length} open: ${SEV.map((k) => `${sev(k)} ${k}`).join(", ")}`}>
              {SEV.map((k) =>
                sev(k) ? (
                  <span key={k} className={`inline-flex items-center px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums ${SEV_CHIP[k]}`} aria-hidden>
                    {sev(k)} {k}
                  </span>
                ) : null,
              )}
            </span>
          ) : (
            <span className="text-ash-500">None</span>
          )}
        </td>
        <td className="hidden px-2 py-3 text-right tabular-nums sm:table-cell">
          <span className="block font-semibold">{st.cars.length} cars</span>
          <span className="block text-xs text-ash-700">{eurCompact(st.financedTotal)}</span>
        </td>
        <td className={`hidden px-2 py-3 text-right tabular-nums xl:table-cell ${used >= 0.9 ? "font-semibold" : ""}`}>
          {Math.round(used * 100)}%
          <span className="block text-xs font-normal text-ash-700">of {eurCompact(d.creditLine)}</span>
        </td>
        <td className="hidden px-2 py-3 md:table-cell lg:hidden xl:table-cell">
          <span className="flex items-center gap-2">
            <span className="block h-2 w-16 border border-line" aria-hidden>
              <span className="block h-full bg-lime transition-[width] duration-700" style={{ width: `${autoPct * 100}%` }} />
            </span>
            <span className="w-[4ch] text-right tabular-nums">{Math.round(autoPct * 100)}%</span>
          </span>
        </td>
        <td className="py-3 pr-2 text-right">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setWhy((w) => !w); }}
            aria-expanded={why}
            aria-controls={breakdownId}
            aria-label={`${why ? "Hide" : "Show"} risk breakdown for ${d.name}`}
            className="inline-flex size-8 items-center justify-center border border-transparent text-base hover:border-line hover:bg-paper"
          >
            <span aria-hidden>{why ? "−" : "+"}</span>
          </button>
        </td>
      </tr>
      {why && (
        <tr id={breakdownId} className="border-b border-line bg-mist last:border-b-0">
          <td colSpan={7} className="px-4 pt-1 pb-4">
            <div className="max-w-md">
              <RiskBreakdown parts={risk.parts} score={risk.score} />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export function RiskBreakdown({ parts, score }: { parts: { label: string; points: number }[]; score: number }) {
  const max = Math.max(35, ...parts.map((p) => Math.abs(p.points)));
  return (
    <div>
      <ul className="space-y-1.5">
        {parts.map((p) => (
          <li key={p.label} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-2 text-sm">
            <span className="truncate">{p.label}</span>
            <span className="relative h-2 bg-ash-100" aria-hidden>
              <span
                className={`absolute top-0 h-full ${p.points < 0 ? "right-1/2 bg-lime" : "left-1/2 bg-ink"}`}
                style={{ width: `${(Math.abs(p.points) / max) * 50}%` }}
              />
              <span className="absolute top-[-2px] left-1/2 h-[12px] w-px bg-ash-500" />
            </span>
            <span className="text-right tabular-nums">{p.points > 0 ? `+${p.points}` : p.points}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t border-line pt-1.5 text-sm font-semibold">
        <span>Score: {riskWord(score).toLowerCase()}</span>
        <span className="tabular-nums">{score}</span>
      </p>
    </div>
  );
}
