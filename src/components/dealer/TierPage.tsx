"use client";
import { TierBadge } from "@/components/ui/TierBadge";
import { CLEAN_STREAK_TO_STEP_UP, TIERS, TIER_ORDER } from "@/config/tiers";
import type { Dealer } from "@/lib/types";
import { FREQUENCY, rateText } from "./tierCopy";

const HEAD: Record<Dealer["tier"], string> = {
  Gold: "bg-gold",
  Silver: "bg-silver",
  Standard: "bg-paper",
  Review: "bg-ink text-paper",
};

const HELPS = ["Clean check-ins", "Connected-car consent on", "Pay off sold cars promptly"];

export function TierPage({ dealer }: { dealer: Dealer }) {
  const tier = dealer.tier;
  const t = TIERS[tier];
  const nextTier = tier === "Review" || tier === "Gold" ? null : TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
  const streak = Math.min(dealer.cleanStreak, CLEAN_STREAK_TO_STEP_UP);

  return (
    <div>
      <section className={`px-4 pt-10 pb-8 ${HEAD[tier]}`}>
        <p className="text-sm">Your tier</p>
        <h2 className="mt-4 display-wide text-[clamp(2.2rem,10vw,3rem)]">{tier}</h2>
      </section>
      <dl className="border-t border-ink">
        <Benefit label="Line review" value={t.lineReview ? `Reply within ${t.lineReview}` : "After a quick chat"} />
        <Benefit label="Rate" value={rateText(t.rateDiscountPp)} />
        <Benefit label="Checks" value={FREQUENCY[tier]} />
      </dl>

      {tier === "Review" ? (
        <Section title="We'd like to talk it through">
          <p className="px-4 pb-8 text-ash-700">Your account manager will reach out.</p>
        </Section>
      ) : nextTier ? (
        <Section title={`To ${nextTier}`} aside={<TierBadge tier={nextTier} />}>
          <div className="px-4 pb-8">
            <ol className="flex gap-1.5" aria-hidden>
              {Array.from({ length: CLEAN_STREAK_TO_STEP_UP }, (_, i) => (
                <li key={i} className={`h-3 flex-1 border ${i < streak ? "border-lime bg-lime" : "border-ink bg-paper"}`} />
              ))}
            </ol>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="figure text-3xl">{streak}/{CLEAN_STREAK_TO_STEP_UP}</span>
              <span className="text-sm text-ash-700">clean check-ins in a row</span>
            </p>
          </div>
        </Section>
      ) : (
        <Section title="You're at the top">
          {dealer.cleanStreak > 0 ? (
            <p className="flex items-baseline gap-2 px-4 pb-8">
              <span className="figure text-3xl">{dealer.cleanStreak}</span>
              <span className="text-sm text-ash-700">clean check-ins in a row</span>
            </p>
          ) : <div className="pb-2" />}
        </Section>
      )}

      <Section title={tier === "Gold" ? "How to keep it" : tier === "Review" ? "What helps" : "How to move up"}>
        <ul>
          {HELPS.map((h) => (
            <li key={h} className="flex items-center gap-3 border-t border-line px-4 py-4">
              <span aria-hidden className="size-2 shrink-0 bg-brand-deep" />
              <span className="font-medium">{h}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="All tiers">
        <ol>
          {[...TIER_ORDER].reverse().map((name) => {
            const x = TIERS[name];
            const on = name === tier;
            return (
              <li key={name} className={`relative border-t border-line px-4 py-4 ${on ? "bg-brand-soft" : ""}`} aria-current={on ? "true" : undefined}>
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
                  {x.lineReview ? <>Line review reply within <span className="font-medium text-ink">{x.lineReview}</span></> : "Line review after account review"}
                </p>
              </li>
            );
          })}
        </ol>
      </Section>
      <div className="border-t border-ink" />
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink">
      <div className="flex items-center justify-between gap-3 px-4 pt-8 pb-5">
        <h3 className="display-wide text-[1.5rem]">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Benefit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line px-4 py-4 first:border-t-0">
      <dt className="shrink-0 text-sm text-ash-700">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
