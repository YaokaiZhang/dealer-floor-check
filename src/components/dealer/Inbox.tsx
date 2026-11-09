"use client";
import { useEffect, useState } from "react";
import { TierBadge } from "@/components/ui/TierBadge";
import { TIERS } from "@/config/tiers";
import { actions } from "@/lib/store";
import type { CheckIn, Dealer } from "@/lib/types";
import { Bar, Check, TextAction } from "./Bar";
import { FREQUENCY } from "./tierCopy";

/** quiet: something else (a payoff) leads the screen, so skip the "All good" headline. */
export function Inbox({ dealer, checkIns, onTier, quiet }: { dealer: Dealer; checkIns: CheckIn[]; onTier: () => void; quiet?: boolean }) {
  if (checkIns.length === 0) return <EmptyInbox dealer={dealer} onTier={onTier} quiet={quiet} />;
  return (
    <div>
      {checkIns.map((ci) => <CheckInCard key={ci.id} checkIn={ci} />)}
    </div>
  );
}

function EmptyInbox({ dealer, onTier, quiet }: { dealer: Dealer; onTier: () => void; quiet?: boolean }) {
  const t = TIERS[dealer.tier];
  return (
    <div>
      {!quiet && (
        <section className="flex items-end justify-between gap-4 px-4 pt-10 pb-8">
          <h2 className="display-wide text-[1.9rem]">All good</h2>
          <Check size={48} />
        </section>
      )}

      <button type="button" onClick={onTier} className="group block w-full border-t border-ink text-left transition-colors duration-300 hover:bg-ink hover:text-paper focus-visible:-outline-offset-4">
        <span className="flex items-center justify-between gap-3 px-4 pt-6 pb-4">
          <span className="display-wide text-[1.5rem]">Your tier</span>
          <TierBadge tier={dealer.tier} />
        </span>
        <dl className="text-sm">
          {t.lineReview && (
            <div className="flex justify-between gap-3 border-t border-line px-4 py-3 group-hover:border-paper/20"><dt className="text-ash-700 group-hover:text-paper/70">Line review</dt><dd className="text-right font-medium">Reply within {t.lineReview}</dd></div>
          )}
          <div className="flex justify-between gap-3 border-t border-line px-4 py-3 group-hover:border-paper/20"><dt className="text-ash-700 group-hover:text-paper/70">Checks</dt><dd className="text-right font-medium">{FREQUENCY[dealer.tier]}</dd></div>
        </dl>
        <span className="flex items-center justify-between border-t border-ink px-4 py-4 font-medium group-hover:border-paper/20">
          Benefits <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </button>
      <div className="border-t border-ink" />
    </div>
  );
}

/** What the dealer is signing up for, as three facts. */
function Ask({ targeted }: { targeted: boolean }) {
  const facts = targeted
    ? [["Cars", "1"], ["Photos", "3"], ["Time", "~2 min"]]
    : [["Cars", "A few"], ["Photos", "3 each"], ["Time", "~2 min a car"]];
  return (
    <dl className="grid grid-cols-3 border-t border-ink">
      {facts.map(([k, v], i) => (
        <div key={k} className={`flex flex-col gap-2 px-4 py-4 ${i > 0 ? "border-l border-line" : ""}`}>
          <dt className="text-sm text-ash-700">{k}</dt>
          <dd className="figure text-2xl">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The bank sets the window. No countdown: just the time, a start button when it's open, and one way out. */
function CheckInCard({ checkIn }: { checkIn: CheckIn }) {
  const now = useNow(15_000);
  const [asked, setAsked] = useState(false);
  const targeted = checkIn.reason === "targeted";
  const title = targeted ? "One quick photo" : "Quick check-in";
  const opens = Date.parse(checkIn.window.start) - 15 * 60_000;
  const isOpen = now >= opens && now <= Date.parse(checkIn.window.end);

  return (
    <section className="animate-rise border-b border-ink" aria-label={title}>
      <h2 className="px-4 pt-10 pb-8 display-wide text-[1.9rem]">{targeted ? title : <>Quick <span className="whitespace-nowrap">check-in</span></>}</h2>
      <Ask targeted={targeted} />
      <div className={`flex items-center gap-3 border-t border-ink px-4 py-4 ${isOpen ? "bg-lime" : "bg-brand-soft"}`} role="status">
        {isOpen && <Check size={28} />}
        <p className="font-medium">{checkIn.window.label}{checkIn.rescheduled ? " (new time)" : ""}</p>
      </div>
      {isOpen ? (
        <Bar onClick={() => { actions.startCheckIn(checkIn.id); window.scrollTo({ top: 0 }); }}>Start check-in</Bar>
      ) : (
        <p className="border-t border-ink px-4 py-4 text-sm text-ash-700">You can start when the time comes. We&apos;ll show the cars then.</p>
      )}
      {!checkIn.rescheduled && !asked ? (
        <TextAction className="my-1" onClick={() => { setAsked(true); actions.requestAnotherTime(checkIn.id); }}>This time doesn&apos;t work? Ask for another</TextAction>
      ) : checkIn.rescheduled ? (
        <p className="px-4 py-3 text-sm text-ash-700">We picked a new time within two weeks.</p>
      ) : null}
    </section>
  );
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
