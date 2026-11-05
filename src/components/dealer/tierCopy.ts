import type { Tier } from "@/lib/types";

/** Qualitative check-in frequency per tier. Never a number, never a date. */
export const FREQUENCY: Record<Tier, string> = {
  Gold: "Fewest check-ins and visits",
  Silver: "Few check-ins and visits",
  Standard: "Occasional check-ins and visits",
  Review: "More frequent check-ins and visits for now",
};

export const rateText = (pp: number) => (pp > 0 ? `−${pp.toFixed(2)} pp on your rate` : "Standard rate");
