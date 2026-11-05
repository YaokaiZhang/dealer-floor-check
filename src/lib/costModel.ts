import { ASSUMPTIONS, type Assumptions } from "@/config/assumptions";

/**
 * Cost / risk model per dealer per year, as a function of f = scheduled physical checks per year.
 *   checkCost(f)    = f × auditorVisitCost
 *   detectionDays   = 365 / (2f)  (mean wait until the next evenly spaced check), capped
 *   lossPerIncident = avgLoan × lossGivenFraud × (1 + extraCarsPerMonth × detectionDays / 30)
 *   fraudLoss(f)    = incidentsPerDealerYear × lossPerIncident
 * With signals, most incidents are detected within days; the rest by checks or check-ins.
 */
/** Verifier fee for one spot check: a flat rate, however many cars are on the list. */
export const visitFee = (_cars: number, a: Assumptions = ASSUMPTIONS) => a.gigCheckCost;

export interface CostPoint { f: number; checkCost: number; fraudLoss: number; total: number; detectionDays: number }

const lossFor = (days: number, a: Assumptions) =>
  a.incidentsPerDealerYear * a.avgLoanPerCar * a.lossGivenFraud * (1 + (a.extraCarsPerMonthUndetected * days) / 30);

export function traditional(f: number, a: Assumptions = ASSUMPTIONS): CostPoint {
  const detectionDays = f > 0 ? Math.min(a.maxDetectionDays, 365 / (2 * f)) : a.maxDetectionDays;
  const checkCost = f * a.auditorVisitCost;
  const fraudLoss = lossFor(detectionDays, a);
  return { f, checkCost, fraudLoss, total: checkCost + fraudLoss, detectionDays };
}

export function withSignals(f: number, a: Assumptions = ASSUMPTIONS): CostPoint {
  const touches = f + a.checkInsPerDealerYear; // physical checks + remote check-ins
  const residualDays = Math.min(a.maxDetectionDays, 365 / (2 * touches));
  const detectionDays = a.signalCoverage * a.signalDetectionDays + (1 - a.signalCoverage) * residualDays;
  const checkCost =
    f * a.auditorVisitCost +
    a.checkInsPerDealerYear * a.checkInHandlingCost +
    a.gigChecksPerDealerYear * visitFee(a.avgCarsPerVisit, a) +
    a.dataFeedCostPerDealerYear;
  const fraudLoss = lossFor(detectionDays, a);
  return { f, checkCost, fraudLoss, total: checkCost + fraudLoss, detectionDays };
}

export function curve(fn: (f: number, a?: Assumptions) => CostPoint, a: Assumptions = ASSUMPTIONS): CostPoint[] {
  return Array.from({ length: a.maxScheduledChecks + 1 }, (_, f) => fn(f, a));
}

export const minimum = (pts: CostPoint[]) => pts.reduce((m, p) => (p.total < m.total ? p : m), pts[0]);

/** Headline: floor-check cost reduction at equal or lower fraud exposure (optimum vs optimum). */
export function headline(a: Assumptions = ASSUMPTIONS) {
  const t = minimum(curve(traditional, a));
  const s = minimum(curve(withSignals, a));
  return {
    traditional: t,
    signals: s,
    checkCostReductionPct: Math.round((1 - s.checkCost / t.checkCost) * 100),
    fraudLossReductionPct: Math.round((1 - s.fraudLoss / t.fraudLoss) * 100),
    totalReductionPct: Math.round((1 - s.total / t.total) * 100),
    portfolioSavings: Math.round((t.total - s.total) * a.portfolioDealers),
  };
}
