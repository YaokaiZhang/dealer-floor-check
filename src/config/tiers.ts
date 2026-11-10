import type { Tier } from "@/lib/types";

/** Tier rules. All perks are illustrative. Every new dealer starts at Silver (BASE_TIER). */
export const TIERS: Record<Tier, {
  order: number;
  checkInsPerYear: number; // rate of random self-check requests
  /** Share of the dealer's in-stock cars checked in person (random spot checks) over a year. */
  physicalShare: number;
  /** Most cars a verifier checks on one spot-check visit. */
  visitCars: number;
  /** p: share of missing cars to catch; confidence: over a year of check-ins; maxCars: cap per check-in. */
  sampling: { p: number; confidence: number; maxCars: number };
  /** How fast the credit team answers a request to review the credit line; null while line reviews are paused. */
  lineReview: string | null;
  rateDiscountPp: number;
  blurb: string;
}> = {
  Gold: { order: 3, checkInsPerYear: 2, physicalShare: 0.05, visitCars: 3, sampling: { p: 0.25, confidence: 0.8, maxCars: 4 }, lineReview: "1 business day", rateDiscountPp: 0.25, blurb: "Clean, on-time check-ins. Our most trusted partners." },
  Silver: { order: 2, checkInsPerYear: 4, physicalShare: 0.15, visitCars: 3, sampling: { p: 0.15, confidence: 0.9, maxCars: 5 }, lineReview: "2 business days", rateDiscountPp: 0.1, blurb: "Where every dealer starts." },
  Standard: { order: 1, checkInsPerYear: 6, physicalShare: 0.3, visitCars: 3, sampling: { p: 0.1, confidence: 0.95, maxCars: 6 }, lineReview: "5 business days", rateDiscountPp: 0, blurb: "A missed or failed check-in, or a late payoff." },
  Review: { order: 0, checkInsPerYear: 12, physicalShare: 0.6, visitCars: 4, sampling: { p: 0.05, confidence: 0.99, maxCars: 10 }, lineReview: null, rateDiscountPp: 0, blurb: "Something needs a closer look together." },
};

/** Worst to best. */
export const TIER_ORDER: Tier[] = ["Review", "Standard", "Silver", "Gold"];
/** Every new dealer starts here. */
export const BASE_TIER: Tier = "Silver";
/** Clean check-ins in a row needed to step up one tier. */
export const CLEAN_STREAK_TO_STEP_UP = 3;

export const tierUp = (t: Tier): Tier => TIER_ORDER[Math.min(TIER_ORDER.length - 1, TIER_ORDER.indexOf(t) + 1)];
export const tierDown = (t: Tier): Tier => TIER_ORDER[Math.max(0, TIER_ORDER.indexOf(t) - 1)];

/**
 * In-person checks a year for a dealer: ceil(share × in-stock cars) cars, in visits of up to
 * `visitCars` cars. carsPerVisit spreads the cars evenly over the visits.
 */
export function physicalPlan(tier: Tier, stock: number): { cars: number; visits: number; carsPerVisit: number } {
  const t = TIERS[tier];
  const cars = stock > 0 ? Math.ceil(t.physicalShare * stock) : 0;
  const visits = Math.ceil(cars / t.visitCars);
  return { cars, visits, carsPerVisit: visits ? Math.ceil(cars / visits) : 0 };
}

/** "about 5%" */
export const sharePct = (tier: Tier) => `${Math.round(TIERS[tier].physicalShare * 100)}%`;
