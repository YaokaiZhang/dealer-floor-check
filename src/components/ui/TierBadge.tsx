import type { Tier } from "@/lib/types";

const STYLE: Record<Tier, string> = {
  Gold: "bg-lime text-ink border-ink",
  Silver: "bg-brand text-ink border-ink",
  Standard: "bg-paper text-ink border-ink",
  Review: "bg-ink text-paper border-ink",
};

export function TierBadge({ tier, size = "sm" }: { tier: Tier; size?: "sm" | "lg" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border ${STYLE[tier]} ${size === "lg" ? "px-3 py-1.5 display-md" : "px-1.5 py-0.5 tag-text"}`}>
      <span className={`inline-block ${size === "lg" ? "size-2" : "size-1.5"} ${tier === "Review" ? "bg-high" : "bg-ink"}`} />
      {tier}
    </span>
  );
}
