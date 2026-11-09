"use client";
import { useState } from "react";
import type { Store } from "@/lib/store";
import type { Car } from "@/lib/types";
import { CONFIRMED_DAYS, carRisk, carsOf, isConfirmed, riskScore } from "@/lib/risk";
import { TierBadge } from "@/components/ui/TierBadge";

type Bay = "confirmed" | "stale" | "never" | "payoff" | "alert";
const BAY: Record<Bay, { cls: string; label: string }> = {
  confirmed: { cls: "bg-lime border-lime", label: `Confirmed in the last ${CONFIRMED_DAYS} days` },
  stale: { cls: "bg-paper border-ash-500", label: "Confirmed earlier" },
  never: { cls: "bg-ash-100 border-ash-100", label: "Never confirmed" },
  payoff: { cls: "bg-medium border-medium", label: "Sold, payoff due" },
  alert: { cls: "bg-high border-high", label: "Open alert" },
};

function bayOf(s: Store, c: Car, now: number, alerted: Set<string>): Bay {
  if (alerted.has(c.vin) || c.status === "sold_unpaid_suspect") return "alert";
  if (c.status === "sold_awaiting_payoff") return "payoff";
  if (isConfirmed(c, now)) return "confirmed";
  return c.lastCheckedAt ? "stale" : "never";
}

/** Every financed car as a parking bay, grouped by dealer, riskiest dealers first. Riskiest cars get an ink ring. */
export function LotMap({ s, onOpen }: { s: Store; onOpen: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const now = Date.now();
  const alerted = new Set(s.alerts.filter((a) => a.status === "open" || a.status === "investigating").map((a) => a.vin));
  const dealers = s.dealers.map((d) => ({ d, score: riskScore(s, d, now).score })).sort((a, b) => b.score - a.score);
  const shown = all ? dealers : dealers.slice(0, 24);

  return (
    <div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {(Object.keys(BAY) as Bay[]).map((k) => (
          <li key={k} className="flex items-center gap-2"><span className={`inline-block h-3 w-2 border ${BAY[k].cls}`} aria-hidden />{BAY[k].label}</li>
        ))}
        <li className="flex items-center gap-2"><span className="inline-block h-3 w-2 border border-ink bg-paper outline outline-1 outline-offset-1 outline-ink" aria-hidden />Riskiest cars (drawn most)</li>
      </ul>
      <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {shown.map(({ d, score }) => {
          const cars = carsOf(s, d.id).filter((c) => c.status !== "sold_paid" && c.status !== "paid_off");
          return (
            <button key={d.id} type="button" onClick={() => onOpen(d.id)} className="group min-w-0 text-left focus-visible:outline-offset-4" aria-label={`${d.name}: ${cars.length} cars, risk ${score}`}>
              <span className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-semibold group-hover:underline">{d.name}</span>
                <span className="flex shrink-0 items-center gap-1.5"><TierBadge tier={d.tier} /><span className="tabular-nums text-ash-700">{score}</span></span>
              </span>
              <span className="mt-2 flex flex-wrap gap-[3px]" aria-hidden>
                {cars.map((c) => {
                  const risky = carRisk(s, c, now).weight >= 3.5;
                  return <span key={c.vin} className={`h-[13px] w-[7px] border ${BAY[bayOf(s, c, now, alerted)].cls} ${risky ? "outline outline-1 outline-offset-1 outline-ink" : ""}`} />;
                })}
              </span>
            </button>
          );
        })}
      </div>
      {dealers.length > 24 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-6 border border-ink px-3 py-2 text-sm font-medium hover:bg-ink hover:text-paper">
          {all ? "Show the riskiest 24" : `Show all ${dealers.length} dealers`}
        </button>
      )}
    </div>
  );
}
