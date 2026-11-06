"use client";
import { useState } from "react";
import { TierBadge } from "@/components/ui/TierBadge";
import { TIERS } from "@/config/tiers";
import type { CheckIn, Dealer, Tier } from "@/lib/types";
import { Bar, Check, TextAction } from "./Bar";

export function DoneScreen({ checkIn, dealer, tierBefore, onBack, onTier }: { checkIn: CheckIn; dealer: Dealer; tierBefore: Tier; onBack: () => void; onTier: () => void }) {
  const [requested, setRequested] = useState(false);
  const clean = checkIn.outcome === "clean";
  const lineReview = TIERS[dealer.tier].lineReview;
  const movedUp = TIERS[dealer.tier].order > TIERS[tierBefore].order;

  if (!clean) {
    return (
      <div>
        <h2 className="px-4 pt-10 pb-8 display-wide text-[1.9rem]" role="status"><span className="whitespace-nowrap">Check-in</span> done</h2>
        <Bar tone="paper" onClick={onBack}>Back to check-ins</Bar>
        <div className="border-t border-ink" />
      </div>
    );
  }

  const n = checkIn.sampledVins.length;
  return (
    <div>
      <section className="bg-lime px-4 pt-10 pb-8" role="status">
        <Check size={56} draw />
        <h2 className="mt-8 display-wide text-[clamp(2rem,9vw,2.75rem)]">All<br />verified</h2>
        <p className="mt-5 flex items-baseline gap-2">
          <span className="figure text-3xl">{n}/{n}</span>
          <span className="text-sm">car{n === 1 ? "" : "s"} confirmed</span>
        </p>
      </section>

      {lineReview && (
        <section className="border-t border-ink">
          <div className="px-4 pt-8 pb-6">
            <h3 className="display-wide text-[1.5rem]">Line review</h3>
            <p className="mt-2 text-sm text-ash-700">Reply within {lineReview}</p>
          </div>
          {requested ? (
            <div className="flex items-center gap-3 border-t border-ink bg-brand-soft px-4 py-5" role="status" aria-live="polite">
              <Check size={28} />
              <p className="font-medium">Line review requested</p>
            </div>
          ) : (
            <Bar tone="brand" onClick={() => setRequested(true)}>Request a line review</Bar>
          )}
        </section>
      )}

      <button type="button" onClick={onTier} className="group flex min-h-16 w-full items-center gap-3 border-y border-ink px-4 py-4 text-left transition-colors duration-300 hover:bg-ink hover:text-paper focus-visible:-outline-offset-4">
        <TierBadge tier={dealer.tier} />
        <span className="flex-1 font-medium">{movedUp ? `You've moved up to ${dealer.tier}` : `You're ${dealer.tier} tier`}</span>
        <span className="text-sm">Benefits</span>
        <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
      </button>

      <TextAction className="mt-2" onClick={onBack}>Back to check-ins</TextAction>
    </div>
  );
}
