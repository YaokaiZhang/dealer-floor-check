"use client";
import { useState } from "react";
import type { Store } from "@/lib/store";
import type { Dealer, Severity } from "@/lib/types";
import { portfolioStats, riskScore } from "@/lib/risk";
import { eurCompact } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/TierBadge";
import { Arrow } from "@/components/ui/Button";

export const riskTone = (score: number) => (score >= 60 ? "bg-high" : score >= 35 ? "bg-medium" : "bg-lime");
export const riskWord = (score: number) => (score >= 60 ? "Act now" : score >= 35 ? "Watch" : "Low");

export function Portfolio({ s, onOpen }: { s: Store; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {s.dealers.map((d, i) => (
        <DealerCard key={d.id} s={s} d={d} onOpen={() => onOpen(d.id)} delay={i * 60} />
      ))}
    </div>
  );
}

function DealerCard({ s, d, onOpen, delay }: { s: Store; d: Dealer; onOpen: () => void; delay: number }) {
  const st = portfolioStats(s, d.id);
  const risk = riskScore(s, d);
  const [why, setWhy] = useState(false);
  const autoPct = st.cars.length ? st.autoVerified.length / st.cars.length : 0;
  const sev = (k: Severity) => st.openAlerts.filter((a) => a.severity === k).length;

  return (
    <Card interactive className="flex flex-col animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <button type="button" onClick={onOpen} className="group/button flex flex-1 flex-col p-5 text-left focus-visible:outline-offset-[-4px]" aria-label={`Open ${d.name}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="tag-text text-ash-700">{d.city}</p>
            <h3 className="mt-1 display-lg">{d.name}</h3>
          </div>
          <TierBadge tier={d.tier} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink pt-4">
          <div>
            <p className="tag-text text-ash-700">Risk</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="figure text-4xl">{risk.score}</span>
              <span className="tag-text text-ash-700">/100</span>
            </p>
            <div className="mt-2 h-1.5 bg-ash-100" aria-hidden>
              <div className={`h-full ${riskTone(risk.score)} transition-[width] duration-500`} style={{ width: `${risk.score}%` }} />
            </div>
          </div>
          <div>
            <p className="tag-text text-ash-700">Financed</p>
            <p className="mt-1 figure text-4xl">{st.cars.length}</p>
            <p className="mt-1 text-xs text-ash-700">{eurCompact(st.financedTotal)}</p>
          </div>
          <div>
            <p className="tag-text text-ash-700">Alerts</p>
            <p className="mt-1 figure text-4xl">{st.openAlerts.length}</p>
            <div className="mt-1 flex gap-1" aria-label={`${sev("high")} high, ${sev("medium")} medium, ${sev("low")} low`}>
              {(["high", "medium", "low"] as const).map((k) =>
                sev(k) ? (
                  <span key={k} className={`px-1 tag-text ${k === "high" ? "bg-high text-paper" : k === "medium" ? "bg-medium" : "bg-low-soft"}`}>
                    {sev(k)} {k[0].toUpperCase()}
                  </span>
                ) : null,
              )}
              {!st.openAlerts.length && <span className="text-xs text-ash-500">none</span>}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              <strong className="font-semibold tabular-nums">{st.autoVerified.length}</strong> of {st.cars.length} verified automatically
            </span>
            <span className="tabular-nums text-ash-700">{Math.round(autoPct * 100)}%</span>
          </div>
          <div className="mt-1.5 flex h-2 border border-ink" aria-hidden>
            <div className="h-full bg-lime transition-[width] duration-700" style={{ width: `${autoPct * 100}%` }} />
          </div>
        </div>
        <span className="mt-4 inline-flex items-center gap-1 tag-text text-brand-deep">
          Open dealer <Arrow />
        </span>
      </button>

      <div className="border-t border-ink">
        <button
          type="button"
          onClick={() => setWhy((w) => !w)}
          aria-expanded={why}
          className="flex w-full items-center justify-between px-5 py-2 tag-text hover:bg-mist"
        >
          <span>Why {risk.score}? Risk breakdown</span>
          <span aria-hidden>{why ? "−" : "+"}</span>
        </button>
        {why && (
          <div className="px-5 pb-4">
            <RiskBreakdown parts={risk.parts} score={risk.score} />
          </div>
        )}
      </div>
    </Card>
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
      <p className="mt-2 flex justify-between border-t border-ink pt-1.5 text-sm font-semibold">
        <span>Score (clamped 0–100) · {riskWord(score)}</span>
        <span className="tabular-nums">{score}</span>
      </p>
    </div>
  );
}
