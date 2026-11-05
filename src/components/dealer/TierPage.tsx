"use client";
import { Card, SectionTag } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
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

export function TierPage({ dealer }: { dealer: Dealer }) {
  const tier = dealer.tier;
  const t = TIERS[tier];
  const nextTier = tier === "Review" || tier === "Gold" ? null : TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
  const streak = Math.min(dealer.cleanStreak, CLEAN_STREAK_TO_STEP_UP);

  return (
    <div className="space-y-8">
      <Card className="animate-rise overflow-hidden">
        <div className={`border-b border-ink px-5 py-6 ${HEAD[tier]}`}>
          <SectionTag className={tier === "Review" ? "text-brand" : "text-ink"}>Your tier</SectionTag>
          <h2 className="mt-3 display-xl">You&apos;re {tier} tier</h2>
          <p className="mt-2">{t.blurb}</p>
        </div>
        <dl className="divide-y divide-ink">
          <Benefit label="Credit-line top-up" value={t.topUp.amount > 0 ? eur(t.topUp.amount) : "After a quick chat"} sub={t.topUp.amount > 0 ? t.topUp.speed : undefined} />
          <Benefit label="Rate" value={rateText(t.rateDiscountPp)} />
          <Benefit label="Check-ins" value={FREQUENCY[tier]} />
        </dl>
      </Card>

      {tier === "Review" ? (
        <section>
          <SectionTag>What happens now</SectionTag>
          <Card className="mt-3 p-5">
            <p className="display-md">We&apos;d like to talk it through together</p>
            <p className="mt-2 text-ash-700">
              Something in our data needs a closer look. Your account manager will reach out to go through it with you.
              Nothing changes on your credit line or terms without a conversation first.
            </p>
            <p className="mt-3 text-ash-700">
              In the meantime you may get a check-in a little more often. Once things are cleared up, you return to your previous tier.
            </p>
          </Card>
        </section>
      ) : (
        <section>
          <SectionTag>{nextTier ? `On your way to ${nextTier}` : "Keeping Gold"}</SectionTag>
          <Card className="mt-3 p-5">
            {nextTier ? (
              <>
                <p className="display-md">{streak} of {CLEAN_STREAK_TO_STEP_UP} clean check-ins in a row</p>
                <ol className="mt-4 flex gap-1.5" aria-hidden>
                  {Array.from({ length: CLEAN_STREAK_TO_STEP_UP }, (_, i) => (
                    <li key={i} className={`h-3 flex-1 border border-ink ${i < streak ? "bg-lime" : "bg-paper"}`} />
                  ))}
                </ol>
                <p className="mt-3 text-sm text-ash-700">
                  {CLEAN_STREAK_TO_STEP_UP - streak > 0
                    ? `${CLEAN_STREAK_TO_STEP_UP - streak} more clean check-in${CLEAN_STREAK_TO_STEP_UP - streak === 1 ? "" : "s"} and you move up to ${nextTier}.`
                    : `You're ready to move up to ${nextTier}.`}
                </p>
              </>
            ) : (
              <>
                <p className="display-md">You&apos;re at the top</p>
                <p className="mt-2 text-sm text-ash-700">
                  {dealer.cleanStreak > 0
                    ? `${dealer.cleanStreak} clean check-in${dealer.cleanStreak === 1 ? "" : "s"} in a row since you reached Gold. `
                    : ""}
                  Keep doing what you&apos;re doing and Gold stays yours.
                </p>
              </>
            )}
          </Card>
        </section>
      )}

      <section>
        <SectionTag>{tier === "Gold" ? "How to keep it" : tier === "Review" ? "What helps" : "How to move up"}</SectionTag>
        <ol className="mt-3 border border-ink">
          {[
            ["Clean check-ins", "Photograph the cars we ask about when it suits you. Clean check-ins are what move you up."],
            ["Keep connected-car consent on", "Cars we can see on your lot count as checked, so we ask you for fewer photos."],
            ["Pay off sold cars promptly", "Settle the loan on a car soon after it's sold. It keeps your records simple."],
          ].map(([h, b], i) => (
            <li key={h} className={`flex gap-4 p-4 ${i > 0 ? "border-t border-ink" : ""}`}>
              <span className="figure text-2xl text-brand-deep">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-medium">{h}</p>
                <p className="mt-1 text-sm text-ash-700">{b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTag>All tiers</SectionTag>
        <ol className="mt-3 space-y-2">
          {[...TIER_ORDER].reverse().map((name) => {
            const x = TIERS[name];
            const on = name === tier;
            return (
              <li key={name} className={`border border-ink p-4 ${on ? "bg-brand-soft shadow-card" : "bg-paper"}`} aria-current={on ? "true" : undefined}>
                <div className="flex items-center justify-between gap-3">
                  <TierBadge tier={name} />
                  {on && <Tag tone="ink">You are here</Tag>}
                </div>
                <p className="mt-2 text-sm">{x.blurb}</p>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 tag-text text-ash-700">
                  <li>{FREQUENCY[name]}</li>
                  <li>{x.topUp.amount > 0 ? `${eur(x.topUp.amount)} top-up · ${x.topUp.speed}` : "Top-up after review"}</li>
                  {x.rateDiscountPp > 0 && <li>−{x.rateDiscountPp.toFixed(2)} pp</li>}
                </ul>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-ash-700">
          Tiers move one step at a time. Review never changes your terms on its own: a person at Aurora always talks it through with you first.
        </p>
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
        {sub && <span className="block tag-text text-ash-700">{sub}</span>}
      </dd>
    </div>
  );
}
