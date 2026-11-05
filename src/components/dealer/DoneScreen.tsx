"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/TierBadge";
import { TIERS } from "@/config/tiers";
import { eur } from "@/lib/format";
import { Odometer } from "@/components/ui/Odometer";
import type { CheckIn, Dealer, Tier } from "@/lib/types";

export function DoneScreen({ checkIn, dealer, tierBefore, onBack, onTier }: { checkIn: CheckIn; dealer: Dealer; tierBefore: Tier; onBack: () => void; onTier: () => void }) {
  const [requested, setRequested] = useState(false);
  const clean = checkIn.outcome === "clean";
  const topUp = TIERS[dealer.tier].topUp;
  const movedUp = TIERS[dealer.tier].order > TIERS[tierBefore].order;

  if (!clean) {
    return (
      <Card className="p-5">
        <h2 className="display-lg">Thanks, {dealer.name}</h2>
        <p className="mt-3 text-ash-700">Check-in done.</p>
        <Button variant="secondary" className="mt-6 min-h-12 w-full" onClick={onBack}>Back to check-ins</Button>
      </Card>
    );
  }

  const n = checkIn.sampledVins.length;
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-col items-start gap-4 border-b border-line bg-lime px-5 py-6">
          <span className="flex size-14 items-center justify-center bg-ink text-lime animate-pop" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" pathLength={1} strokeDasharray="1" className="animate-draw" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>
          </span>
          <div role="status">
            <h2 className="display-xl">All verified.<br />Thanks!</h2>
            <p className="mt-2 text-sm">{n} of {n} car{n === 1 ? "" : "s"} confirmed</p>
          </div>
        </div>

        {topUp.amount > 0 && (
          <div className="p-5">
            <p className="figure text-5xl"><Odometer value={eur(topUp.amount)} ms={1100} /></p>
            <p className="mt-2 text-sm text-ash-700">Top-up available on your credit line</p>
            {requested ? (
              <div className="mt-5 flex items-center gap-3 border border-line bg-brand-soft p-4" role="status" aria-live="polite">
                <svg aria-hidden width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" /></svg>
                <p><span className="font-medium">Top-up requested.</span> <span className="text-ash-700">{topUp.speed}.</span></p>
              </div>
            ) : (
              <Button variant="brand" arrow className="mt-5 min-h-14 w-full text-base" onClick={() => setRequested(true)}>
                Request top-up
              </Button>
            )}
          </div>
        )}
      </Card>

      <button type="button" onClick={onTier} className="group flex min-h-16 w-full items-center gap-3 border border-line px-5 py-4 text-left transition-colors hover:bg-brand-soft">
        <TierBadge tier={dealer.tier} />
        <span className="flex-1 font-medium">{movedUp ? `You've moved up to ${dealer.tier}` : `You're ${dealer.tier} tier`}</span>
        <span className="text-sm text-ash-700 underline underline-offset-4">Benefits</span>
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </button>

      <Button variant="ghost" className="min-h-12 w-full" onClick={onBack}>Back to check-ins</Button>
    </div>
  );
}
