/**
 * Business case: today's in-person car checks against Floor Check, for a year across the portfolio.
 * Volumes come from the dealers' tiers (TIERS) and the cost lines from ASSUMPTIONS. Every number that
 * isn't on the case fact sheet is an assumption and is labelled as one.
 */
import { ASSUMPTIONS, type Assumptions } from "@/config/assumptions";
import { physicalPlan, TIERS } from "@/config/tiers";
import type { Tier } from "./types";

export interface CaseRow { item: string; volume: string; cost: number; assumption: boolean }
export interface BusinessCase {
  today: number;
  rows: CaseRow[];
  total: number;
  savingPct: number;
  /** Same plan with local freelance verifiers doing the spot checks. */
  freelanceTotal: number;
  freelanceSavingPct: number;
  inPersonCarChecks: number;
  tierMix: Record<Tier, number>;
}

const n = (x: number) => Math.round(x).toLocaleString("en-US");

export function businessCase(tiers: Tier[], a: Assumptions = ASSUMPTIONS): BusinessCase {
  const tierMix: Record<Tier, number> = { Gold: 0, Silver: 0, Standard: 0, Review: 0 };
  for (const t of tiers) tierMix[t] += 1;
  const dealers = tiers.length;

  const checkIns = tiers.reduce((s, t) => s + TIERS[t].checkInsPerYear, 0);
  const selfCars = checkIns * a.carsPerCheckIn;
  // No per-dealer stock here: plan each dealer at the average stock.
  const plans = tiers.map((t) => physicalPlan(t, a.carsPerFullCount));
  const visits = plans.reduce((s, q) => s + q.visits, 0);
  const visitCars = plans.reduce((s, q) => s + q.cars, 0);
  const fullCars = a.fullCountsPerYear * a.carsPerFullCount;
  const aiCars = selfCars + visitCars;

  const rows: CaseRow[] = [
    { item: "Self-checks", volume: `${n(checkIns)} check-ins, ${n(selfCars)} cars × €${a.checkInHandlingCost}`, cost: selfCars * a.checkInHandlingCost, assumption: false },
    { item: "Spot checks in person", volume: `${n(visits)} visits, ${n(visitCars)} cars × €${a.auditorVisitCost}`, cost: visitCars * a.auditorVisitCost, assumption: false },
    { item: "Full counts after confirmed problems", volume: `${a.fullCountsPerYear} × ${a.carsPerFullCount} cars × €${a.auditorVisitCost}`, cost: fullCars * a.auditorVisitCost, assumption: true },
    { item: "Data feeds (marketplace, register)", volume: `${dealers} dealers × €${a.dataFeedCostPerDealerYear}`, cost: dealers * a.dataFeedCostPerDealerYear, assumption: true },
    { item: "AI photo and data processing", volume: `${n(aiCars)} cars × €${a.aiCostPerCar.toFixed(2)}`, cost: aiCars * a.aiCostPerCar, assumption: true },
    { item: "AI risk model", volume: "Hosting, monitoring, retraining", cost: a.riskModelPerYear, assumption: true },
    { item: "Application maintenance", volume: "Hosting, support, updates", cost: a.appMaintenancePerYear, assumption: true },
  ];
  const today = a.inPersonChecksToday * a.auditorVisitCost;
  const total = rows.reduce((s, r) => s + r.cost, 0);
  const freelanceTotal = total - visitCars * a.auditorVisitCost + visitCars * a.gigCheckCost;
  return {
    today, rows, total,
    savingPct: Math.round((1 - total / today) * 100),
    freelanceTotal,
    freelanceSavingPct: Math.round((1 - freelanceTotal / today) * 100),
    inPersonCarChecks: visitCars + fullCars,
    tierMix,
  };
}

/** The business case as CSV, for the spreadsheet deliverable. */
export function businessCaseCsv(bc: BusinessCase, a: Assumptions = ASSUMPTIONS): string {
  const q = (v: string | number) => (typeof v === "number" ? String(Math.round(v * 100) / 100) : `"${v.replace(/"/g, '""')}"`);
  const lines: (string | number)[][] = [
    ["Section", "Item", "Volume", "Cost per year (EUR)", "Assumption"],
    ["Today", "In-person car checks", `${a.inPersonChecksToday} cars × €${a.auditorVisitCost}`, bc.today, "fact sheet"],
    ...bc.rows.map((r) => ["Floor Check", r.item, r.volume, r.cost, r.assumption ? "assumption" : "fact sheet"]),
    ["Floor Check", "Total", `${bc.inPersonCarChecks} in-person car checks`, bc.total, ""],
    ["Floor Check", "Saving vs today", `${bc.savingPct}%`, bc.today - bc.total, ""],
    ["Upside", "Total with local freelance verifiers", `€${a.gigCheckCost} per car on spot checks`, bc.freelanceTotal, "assumption"],
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
