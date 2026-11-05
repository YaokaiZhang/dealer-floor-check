import type { Tier } from "@/lib/types";

/** Tier rules. All perks are illustrative. */
export const TIERS: Record<Tier, {
  order: number;
  checkInsPerYear: number; // rate of random check-in requests
  /** Unannounced random spot checks by a local verifier. */
  visit: { perYear: number; cars: number };
  /** p: share of missing cars to catch; confidence: over a year of check-ins; maxCars: cap per check-in. */
  sampling: { p: number; confidence: number; maxCars: number };
  /** How fast the credit team answers a request to review the credit line; null while the account is under review. */
  lineReview: string | null;
  rateDiscountPp: number;
  blurb: string;
}> = {
  Gold: { order: 3, checkInsPerYear: 2, visit: { perYear: 1, cars: 3 }, sampling: { p: 0.25, confidence: 0.8, maxCars: 4 }, lineReview: "1 business day", rateDiscountPp: 0.25, blurb: "Our most trusted partners." },
  Silver: { order: 2, checkInsPerYear: 4, visit: { perYear: 2, cars: 3 }, sampling: { p: 0.15, confidence: 0.9, maxCars: 5 }, lineReview: "2 business days", rateDiscountPp: 0.1, blurb: "A steady, clean track record." },
  Standard: { order: 1, checkInsPerYear: 6, visit: { perYear: 3, cars: 3 }, sampling: { p: 0.1, confidence: 0.95, maxCars: 6 }, lineReview: "5 business days", rateDiscountPp: 0, blurb: "Where every partnership starts." },
  Review: { order: 0, checkInsPerYear: 12, visit: { perYear: 6, cars: 4 }, sampling: { p: 0.05, confidence: 0.99, maxCars: 10 }, lineReview: null, rateDiscountPp: 0, blurb: "Something needs a closer look together." },
};

export const TIER_ORDER: Tier[] = ["Review", "Standard", "Silver", "Gold"];
/** Clean check-ins in a row needed to step up one tier. */
export const CLEAN_STREAK_TO_STEP_UP = 3;
