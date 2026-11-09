"use client";
import type { Store } from "@/lib/store";
import { businessCase, businessCaseCsv } from "@/lib/businessCase";
import { ASSUMPTIONS } from "@/config/assumptions";
import { eur } from "@/lib/format";
import { Tag } from "@/components/ui/Tag";

/** Today against Floor Check for a year, with every assumption labelled, plus a CSV for the spreadsheet. */
export function BusinessCasePanel({ s }: { s: Store }) {
  const bc = businessCase(s.dealers.map((d) => d.tier));
  const download = () => {
    const blob = new Blob([businessCaseCsv(bc)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "floor-check-business-case.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const mix = `${bc.tierMix.Gold} Gold, ${bc.tierMix.Silver} Silver, ${bc.tierMix.Standard} Standard, ${bc.tierMix.Review} Review`;

  return (
    <div>
      <div className="grid border border-ink sm:grid-cols-3">
        <Fig k="Today" v={eur(bc.today)} sub={`${ASSUMPTIONS.inPersonChecksToday.toLocaleString("en")} car checks × €${ASSUMPTIONS.auditorVisitCost}`} />
        <Fig k="Floor Check" v={eur(bc.total)} sub={`−${bc.savingPct}% · ${bc.inPersonCarChecks.toLocaleString("en")} in-person car checks`} accent />
        <Fig k="With local verifiers" v={eur(bc.freelanceTotal)} sub={`−${bc.freelanceSavingPct}% · €${ASSUMPTIONS.gigCheckCost} per car on spot checks (assumption)`} />
      </div>
      <div className="mt-6 overflow-x-auto border-y border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="tag-text text-ash-700">
            <tr><th className="p-2 font-normal">Floor Check, a year</th><th className="p-2 font-normal">Volume</th><th className="p-2 text-right font-normal">Cost</th><th className="p-2 font-normal"><span className="sr-only">Source</span></th></tr>
          </thead>
          <tbody>
            {bc.rows.map((r) => (
              <tr key={r.item} className="border-t border-ash-100">
                <td className="p-2 font-medium">{r.item}</td>
                <td className="p-2 text-ash-700">{r.volume}</td>
                <td className="p-2 text-right tabular-nums">{eur(r.cost)}</td>
                <td className="p-2">{r.assumption ? <Tag tone="muted">assumption</Tag> : <Tag tone="outline">fact sheet</Tag>}</td>
              </tr>
            ))}
            <tr className="border-t border-ink font-semibold">
              <td className="p-2">Total</td><td className="p-2 font-normal text-ash-700">Tier mix: {mix}</td><td className="p-2 text-right tabular-nums">{eur(bc.total)}</td><td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={download} className="border border-ink bg-ink px-3 py-2 text-sm font-medium text-paper hover:bg-ink/85">Download CSV</button>
        <p className="text-sm text-ash-700">Spot checks and maintenance are the big costs. The one-off build cost is not included.</p>
      </div>
    </div>
  );
}

function Fig({ k, v, sub, accent }: { k: string; v: string; sub: string; accent?: boolean }) {
  return (
    <div className={`border-ink p-4 [&+&]:border-t sm:[&+&]:border-t-0 sm:[&+&]:border-l ${accent ? "bg-brand" : ""}`}>
      <p className="tag-text text-ash-700">{k}</p>
      <p className="mt-2 figure text-3xl md:text-4xl">{v}</p>
      <p className="mt-1 text-xs text-ash-700">{sub}</p>
    </div>
  );
}
