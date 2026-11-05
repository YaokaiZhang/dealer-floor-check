import type { Tier } from "@/lib/types";

/** Qualitative check-in frequency per tier. Never a number, never a date. */
export const FREQUENCY: Record<Tier, string> = {
  Gold: "Fewest check-ins",
  Silver: "Few check-ins",
  Standard: "Occasional check-ins",
  Review: "More frequent check-ins for now",
};

export const rateText = (pp: number) => (pp > 0 ? `−${pp.toFixed(2)} pp on your rate` : "Standard rate");
