"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/TierBadge";
import { TIERS } from "@/config/tiers";
import { eur } from "@/lib/format";
import type { CheckIn, Dealer, Tier } from "@/lib/types";

export function DoneScreen({ checkIn, dealer, tierBefore, onBack, onTier }: { checkIn: CheckIn; dealer: Dealer; tierBefore: Tier; onBack: () => void; onTier: () => void }) {
  const [requested, setRequested] = useState(false);
  const clean = checkIn.outcome === "clean";
  const topUp = TIERS[dealer.tier].topUp;
  const movedUp = TIERS[dealer.tier].order > TIERS[tierBefore].order;

  if (!clean) {
    return (
      <Card className="animate-rise p-5">
        <h2 className="display-lg">Thanks, {dealer.name}</h2>
        <p className="mt-3 text-ash-700">Check-in done.</p>
        <Button variant="secondary" className="mt-6 min-h-12 w-full" onClick={onBack}>Back to check-ins</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="animate-rise overflow-hidden">
        <div className="flex flex-col items-start gap-4 border-b border-ink bg-lime px-5 py-6">
          <span className="flex size-14 items-center justify-center bg-ink text-lime" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>
          </span>
          <h2 className="display-xl">All verified ✓<br />Thanks!</h2>
          <p className="text-sm">
            {checkIn.sampledVins.length} of {checkIn.sampledVins.length} car{checkIn.sampledVins.length === 1 ? "" : "s"} confirmed
          </p>
        </div>

        {topUp.amount > 0 && (
          <div className="p-5">
            <p className="tag-text text-ash-700">Credit line</p>
            <p className="mt-2 figure text-4xl">{eur(topUp.amount)}</p>
            <p className="mt-1 text-sm text-ash-700">top-up available</p>
            {requested ? (
              <div className="mt-5 border border-ink bg-brand-soft p-4" role="status" aria-live="polite">
                <p className="font-medium">Top-up requested ✓</p>
                <p className="mt-1 tag-text text-ash-700">{topUp.speed}</p>
              </div>
            ) : (
              <Button variant="brand" arrow className="mt-5 min-h-14 w-full text-base" onClick={() => setRequested(true)}>
                Request top-up
              </Button>
            )}
          </div>
        )}
      </Card>

      <button type="button" onClick={onTier} className="group block w-full text-left">
        <Card className="animate-rise p-5 transition-colors group-hover:bg-brand-soft">
          <p className="tag-text text-ash-700">{movedUp ? "You've moved up" : "Your tier"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="display-lg">You&apos;re {dealer.tier} tier</span>
            <TierBadge tier={dealer.tier} size="lg" />
          </div>
          <p className="mt-3 text-sm font-medium underline underline-offset-4">Benefits →</p>
        </Card>
      </button>

      <Button variant="ghost" className="min-h-12 w-full" onClick={onBack}>Back to check-ins</Button>
    </div>
  );
}
