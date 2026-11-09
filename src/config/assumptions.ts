/**
 * Business-case ASSUMPTIONS, editable here only. They are labelled "assumptions" wherever they appear in the UI.
 * Prices and portfolio size come from the case fact sheet (150 dealers, ~3,500 cars, ~3,000 in-person
 * inspections a year, €170 in person / €5 self-check). Everything else is our own estimate.
 */
export const ASSUMPTIONS = {
  portfolioDealers: 150, // dealers financed by Curb (fact sheet)
  auditorVisitCost: 170, // € per in-person inspection (fact sheet)
  incidentsPerDealerYear: 0.15, // sold-out-of-trust incidents per dealer per year
  avgLoanPerCar: 30000, // €
  lossGivenFraud: 0.4, // share of an out-of-trust loan never recovered
  extraCarsPerMonthUndetected: 1.5, // further cars sold out of trust per month while undetected
  maxDetectionDays: 365, // without any checks or signals, found at the yearly review
  // "Curb with signals" scenario
  signalCoverage: 0.85, // share of incidents caught by marketplace/registry/connected-car signals
  signalDetectionDays: 3, // a sale signal becomes an alert once the payoff window passes (+1 day)
  checkInHandlingCost: 5, // € per self-check, charged per check-in (fact sheet)
  checkInsPerDealerYear: 6, // average across tiers
  gigCheckCost: 30, // € flat per spot check by a local freelance verifier, however many cars (estimate; in person by bank staff is €170)
  avgCarsPerVisit: 3,
  gigChecksPerDealerYear: 2, // random spot checks, average across tiers (incl. visits brought forward)
  dataFeedCostPerDealerYear: 120, // € connected-car + registry + marketplace data
  maxScheduledChecks: 12,
  payoffBusinessDays: 2, // business days a dealer has to repay the loan after selling a car (industry: 24–72 h)
} as const;

export type Assumptions = typeof ASSUMPTIONS;
