import type { Tier } from "@/lib/types";

/** Tier rules. All perks are illustrative. */
export const TIERS: Record<Tier, {
  order: number;
  checkInsPerYear: number; // rate of random check-in requests
  sampling: { p: number; confidence: number };
  topUp: { amount: number; speed: string };
  rateDiscountPp: number;
  blurb: string;
}> = {
  Gold: { order: 3, checkInsPerYear: 2, sampling: { p: 0.25, confidence: 0.8 }, topUp: { amount: 40000, speed: "Instant" }, rateDiscountPp: 0.25, blurb: "Our most trusted partners." },
  Silver: { order: 2, checkInsPerYear: 4, sampling: { p: 0.15, confidence: 0.9 }, topUp: { amount: 25000, speed: "Same day" }, rateDiscountPp: 0.1, blurb: "A steady, clean track record." },
  Standard: { order: 1, checkInsPerYear: 6, sampling: { p: 0.1, confidence: 0.95 }, topUp: { amount: 15000, speed: "Within 2 business days" }, rateDiscountPp: 0, blurb: "Where every partnership starts." },
  Review: { order: 0, checkInsPerYear: 12, sampling: { p: 0.05, confidence: 0.99 }, topUp: { amount: 0, speed: "After account review" }, rateDiscountPp: 0, blurb: "Something needs a closer look together." },
};

export const TIER_ORDER: Tier[] = ["Review", "Standard", "Silver", "Gold"];
/** Clean check-ins in a row needed to step up one tier. */
export const CLEAN_STREAK_TO_STEP_UP = 3;
