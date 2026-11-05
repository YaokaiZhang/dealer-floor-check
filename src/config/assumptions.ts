/**
 * Business-case ASSUMPTIONS. All numbers are illustrative and editable here only.
 * They are labelled "assumptions" wherever they appear in the UI.
 */
export const ASSUMPTIONS = {
  portfolioDealers: 250, // dealers financed by Aurora (business-case scale)
  auditorVisitCost: 400, // € per professional floor-check visit
  incidentsPerDealerYear: 0.15, // sold-out-of-trust incidents per dealer per year
  avgLoanPerCar: 30000, // €
  lossGivenFraud: 0.4, // share of an out-of-trust loan never recovered
  extraCarsPerMonthUndetected: 1.5, // further cars sold out of trust per month while undetected
  maxDetectionDays: 365, // without any checks or signals, found at the yearly review
  // "Aurora with signals" scenario
  signalCoverage: 0.85, // share of incidents caught by marketplace/registry/connected-car signals
  signalDetectionDays: 2, // near-real-time detection when a signal fires
  checkInHandlingCost: 5, // € per remote self check-in (handling + vision API)
  checkInsPerDealerYear: 6, // average across tiers
  gigCheckCost: 30, // € flat per spot check by a local verifier, however many cars
  avgCarsPerVisit: 3,
  gigChecksPerDealerYear: 2, // random spot checks, average across tiers (incl. visits brought forward)
  dataFeedCostPerDealerYear: 120, // € connected-car + registry + marketplace data
  maxScheduledChecks: 12,
} as const;

export type Assumptions = typeof ASSUMPTIONS;
