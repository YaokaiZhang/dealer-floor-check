"use client";
import { Card } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/TierBadge";
import { CLEAN_STREAK_TO_STEP_UP, TIERS, TIER_ORDER } from "@/config/tiers";
import { eur } from "@/lib/format";
import type { Dealer } from "@/lib/types";
import { FREQUENCY, rateText } from "./tierCopy";

const HEAD: Record<Dealer["tier"], string> = {
  Gold: "bg-lime",
  Silver: "bg-brand",
  Standard: "bg-paper",
  Review: "bg-ink text-paper",
};

const HELPS = ["Clean check-ins", "Connected-car consent on", "Pay off sold cars promptly"];

export function TierPage({ dealer }: { dealer: Dealer }) {
  const tier = dealer.tier;
  const t = TIERS[tier];
  const nextTier = tier === "Review" || tier === "Gold" ? null : TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
  const streak = Math.min(dealer.cleanStreak, CLEAN_STREAK_TO_STEP_UP);
  const toGo = CLEAN_STREAK_TO_STEP_UP - streak;

  return (
    <div className="space-y-9">
      <Card className="overflow-hidden">
        <div className={`border-b border-ink px-5 py-6 ${HEAD[tier]}`}>
          <h2 className="display-xl">You&apos;re {tier} tier</h2>
          <p className="mt-2">{t.blurb}</p>
        </div>
        <dl className="divide-y divide-ink">
          <Benefit label="Credit-line top-up" value={t.topUp.amount > 0 ? eur(t.topUp.amount) : "After a quick chat"} sub={t.topUp.amount > 0 ? t.topUp.speed : undefined} />
          <Benefit label="Rate" value={rateText(t.rateDiscountPp)} />
          <Benefit label="Checks" value={FREQUENCY[tier]} />
        </dl>
      </Card>

      {tier === "Review" ? (
        <section>
          <h3 className="display-md">We&apos;d like to talk it through</h3>
          <p className="mt-2 text-ash-700">Your account manager will reach out. Nothing changes without a conversation.</p>
        </section>
      ) : nextTier ? (
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="display-md">On your way to {nextTier}</h3>
            <TierBadge tier={nextTier} />
          </div>
          <ol className="mt-4 flex gap-1.5" aria-label={`${streak} of ${CLEAN_STREAK_TO_STEP_UP} clean check-ins in a row`}>
            {Array.from({ length: CLEAN_STREAK_TO_STEP_UP }, (_, i) => (
              <li key={i} className={`h-3 flex-1 border border-ink ${i < streak ? "bg-lime" : "bg-paper"}`} />
            ))}
          </ol>
          <p className="mt-3 text-sm">
            <span className="font-medium">{streak} of {CLEAN_STREAK_TO_STEP_UP}</span>
            <span className="text-ash-700"> clean check-ins in a row. {toGo > 0 ? `${toGo} more to go.` : `Ready for ${nextTier}.`}</span>
          </p>
        </section>
      ) : (
        <section>
          <h3 className="display-md">You&apos;re at the top</h3>
          {dealer.cleanStreak > 0 && <p className="mt-2 text-ash-700">{dealer.cleanStreak} clean check-ins in a row.</p>}
        </section>
      )}

      <section>
        <h3 className="display-md">{tier === "Gold" ? "How to keep it" : tier === "Review" ? "What helps" : "How to move up"}</h3>
        <ul className="mt-3 divide-y divide-ash-300 border-y border-ink">
          {HELPS.map((h) => (
            <li key={h} className="flex items-center gap-3 py-3.5">
              <span aria-hidden className="size-2 shrink-0 bg-brand-deep" />
              <span className="font-medium">{h}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="display-md">All tiers</h3>
        <ol className="mt-3 divide-y divide-ink border border-ink">
          {[...TIER_ORDER].reverse().map((name) => {
            const x = TIERS[name];
            const on = name === tier;
            return (
              <li key={name} className={`relative px-4 py-3.5 ${on ? "bg-brand-soft" : ""}`} aria-current={on ? "true" : undefined}>
                {on && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-ink" />}
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <TierBadge tier={name} />
                    {on && <span className="text-sm font-medium">You</span>}
                  </span>
                  <span className="text-sm whitespace-nowrap text-ash-700">
                    {x.rateDiscountPp > 0 ? <><span className="font-medium text-ink">−{x.rateDiscountPp.toFixed(2)} pp</span> rate</> : "Standard rate"}
                  </span>
                </div>
                <p className="mt-2 text-sm">{FREQUENCY[name]}</p>
                <p className="mt-0.5 text-sm text-ash-700">
                  {x.topUp.amount > 0 ? <><span className="font-medium text-ink">{eur(x.topUp.amount)}</span> top-up, {x.topUp.speed.toLowerCase()}</> : "Top-up after review"}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Benefit({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
      <dt className="shrink-0 text-sm text-ash-700">{label}</dt>
      <dd className="text-right">
        <span className="font-medium">{value}</span>
        {sub && <span className="block text-xs text-ash-700">{sub}</span>}
      </dd>
    </div>
  );
}
