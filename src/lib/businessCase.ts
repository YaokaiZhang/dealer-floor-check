/**
 * Business case: today's in-person inspections against Floor Check, for a year across the portfolio.
 * Worst case: every dealer's cars are phone-checked at the highest sampling share, and every car of the
 * dealers in Review is inspected in person. The Review count follows the live tier mix; the cost lines
 * come from ASSUMPTIONS. Data feeds, maintenance and the one-off build are not included.
 */
import { ASSUMPTIONS, type Assumptions } from "@/config/assumptions";
import type { Tier } from "./types";

export interface CaseRow { item: string; volume: string; cost: number; assumption: boolean }
export interface BusinessCase {
  today: number;
  rows: CaseRow[];
  total: number;
  saved: number;
  savingPct: number;
  /** Same plan with local freelance verifiers doing the in-person inspections. */
  freelanceTotal: number;
  freelanceSavingPct: number;
  inPersonCarChecks: number;
  phoneCars: number;
  tierMix: Record<Tier, number>;
}

const n = (x: number) => Math.round(x).toLocaleString("en-US");
const roundUp = (x: number, step: number) => Math.ceil(x / step) * step;

export function businessCase(tiers: Tier[], a: Assumptions = ASSUMPTIONS): BusinessCase {
  const tierMix: Record<Tier, number> = { Gold: 0, Silver: 0, Standard: 0, Review: 0 };
  for (const t of tiers) tierMix[t] += 1;

  const inPersonCarChecks = tierMix.Review * a.carsPerDealer;
  const phoneCars = roundUp(a.portfolioCars * a.phoneShareWorstCase, a.phoneCarsRoundUpTo);
  const phoneCost = phoneCars * (a.checkInHandlingCost + a.aiCostPerCar);

  const rows: CaseRow[] = [
    { item: "Physical inspections", volume: `${tierMix.Review} Review dealers × ${a.carsPerDealer} cars × €${a.auditorVisitCost}`, cost: inPersonCarChecks * a.auditorVisitCost, assumption: true },
    { item: "Phone check-ins", volume: `${n(phoneCars)} cars × €${a.checkInHandlingCost + a.aiCostPerCar} (€${a.checkInHandlingCost} self-check + €${a.aiCostPerCar} AI)`, cost: phoneCost, assumption: true },
  ];
  const today = a.portfolioCars * a.auditorVisitCost;
  const total = rows.reduce((s, r) => s + r.cost, 0);
  const freelanceTotal = inPersonCarChecks * a.gigCheckCost + phoneCost;
  return {
    today, rows, total,
    saved: today - total,
    savingPct: Math.round((1 - total / today) * 100),
    freelanceTotal,
    freelanceSavingPct: Math.round((1 - freelanceTotal / today) * 100),
    inPersonCarChecks,
    phoneCars,
    tierMix,
  };
}

/** The business case as CSV, for the spreadsheet deliverable. */
export function businessCaseCsv(bc: BusinessCase, a: Assumptions = ASSUMPTIONS): string {
  const q = (v: string | number) => (typeof v === "number" ? String(Math.round(v * 100) / 100) : `"${v.replace(/"/g, '""')}"`);
  const lines: (string | number)[][] = [
    ["Section", "Item", "Volume", "Cost per year (EUR)", "Assumption"],
    ["Today", "In-person inspections", `${a.portfolioCars} cars × €${a.auditorVisitCost}, one per car a year`, bc.today, "fact sheet"],
    ...bc.rows.map((r) => ["Floor Check", r.item, r.volume, r.cost, r.assumption ? "assumption" : "fact sheet"]),
    ["Floor Check", "Total", `${bc.inPersonCarChecks} in-person car checks`, bc.total, ""],
    ["Floor Check", "Saving vs today", `${bc.savingPct}%`, bc.today - bc.total, ""],
    ["Upside", "Total with local freelance verifiers", `€${a.gigCheckCost} per car on in-person inspections`, bc.freelanceTotal, "assumption"],
    ["Upside", "Saving vs today", `${bc.freelanceSavingPct}%`, bc.today - bc.freelanceTotal, ""],
    [],
    ["Tier mix", "Gold", bc.tierMix.Gold, "", ""],
    ["Tier mix", "Silver", bc.tierMix.Silver, "", ""],
    ["Tier mix", "Standard", bc.tierMix.Standard, "", ""],
    ["Tier mix", "Review", bc.tierMix.Review, "", ""],
    [],
    ["Assumption", "Name", "Value", "", ""],
    ...Object.entries(a).map(([k, v]) => ["Assumption", k, v as number, "", ""]),
  ];
  return lines.map((l) => l.map(q).join(",")).join("\n");
}
