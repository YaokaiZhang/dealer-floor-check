/**
 * Business-case ASSUMPTIONS, editable here only. They are labelled "assumptions" wherever they appear in the UI.
 * From the case fact sheet: 150 dealers, ~3,500 cars, ~3,000 in-person car checks a year, €170 per car
 * checked in person, €5 per car self-checked. Everything else is our own estimate.
 */
export const ASSUMPTIONS = {
  portfolioDealers: 150, // dealers financed by Curb (fact sheet)
  auditorVisitCost: 170, // € per car checked in person (fact sheet)
  inPersonChecksToday: 3000, // in-person car checks a year today (fact sheet)
  incidentsPerDealerYear: 0.15, // sold-out-of-trust incidents per dealer per year
  avgLoanPerCar: 30000, // €
  lossGivenFraud: 0.4, // share of an out-of-trust loan never recovered
  extraCarsPerMonthUndetected: 1.5, // further cars sold out of trust per month while undetected
  maxDetectionDays: 365, // without any checks or signals, found at the yearly review
  // "Curb with signals" scenario
  signalCoverage: 0.8, // share of incidents caught by marketplace and register signals
  signalDetectionDays: 3, // a sale signal becomes an alert once the payoff window passes (+1 day)
  checkInHandlingCost: 5, // € per car self-checked (fact sheet)
  carsPerCheckIn: 3, // average cars drawn per self-check
  checkInsPerDealerYear: 6, // average across tiers
  gigCheckCost: 30, // € per car checked by a local freelance verifier (estimate; by bank staff it is €170)
  avgCarsPerVisit: 3,
  gigChecksPerDealerYear: 2, // random spot checks, average across tiers (incl. visits brought forward)
  dataFeedCostPerDealerYear: 120, // € marketplace + register data
  fullCountsPerYear: 15, // full counts after confirmed problems, whole portfolio
  carsPerFullCount: 23, // average stock per dealer
  aiCostPerCar: 0.1, // € AI photo and data processing per car checked
  riskModelPerYear: 3000, // € hosting, monitoring and retraining of the risk model
  appMaintenancePerYear: 60000, // € hosting, support, security updates and fixes
  maxScheduledChecks: 12,
  payoffBusinessDays: 2, // business days a dealer has to repay the loan after selling a car (industry: 24–72 h)
} as const;

export type Assumptions = typeof ASSUMPTIONS;
