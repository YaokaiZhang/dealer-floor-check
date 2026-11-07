"use client";
import { useState } from "react";
import { Tag } from "@/components/ui/Tag";
import { TierBadge } from "@/components/ui/TierBadge";
import { TIERS } from "@/config/tiers";
import { actions } from "@/lib/store";
import type { CheckIn, CheckInWindow, Dealer } from "@/lib/types";
import { Bar, Check, TextAction } from "./Bar";
import { FREQUENCY } from "./tierCopy";
import { bookedLabel, makeWindows } from "./windows";

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
    ? [["Cars", "1"], ["Photos", "3"], ["Time", "~1 min"]]
    : [["Cars", "A few"], ["Photos", "3 each"], ["Time", "~5 min"]];
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

function CheckInCard({ checkIn }: { checkIn: CheckIn }) {
  const [changing, setChanging] = useState(false);
  const targeted = checkIn.reason === "targeted";
  const scheduled = checkIn.status === "scheduled" && checkIn.window && !changing;
  const title = targeted ? "One quick photo" : "Quick check-in";

  return (
    <section className="animate-rise border-b border-ink" aria-label={title}>
      <h2 className="px-4 pt-10 pb-8 display-wide text-[1.9rem]">{targeted ? title : <>Quick <span className="whitespace-nowrap">check-in</span></>}</h2>
      <Ask targeted={targeted} />
      {scheduled ? (
        <>
          <div className="flex items-center gap-3 border-t border-ink bg-lime px-4 py-4" role="status">
            <Check size={28} />
            <p className="font-medium">Booked for {bookedLabel(checkIn.window!)}</p>
          </div>
          <Bar onClick={() => { actions.startCheckIn(checkIn.id); window.scrollTo({ top: 0 }); }}>Start check-in</Bar>
          <TextAction className="my-1" onClick={() => setChanging(true)}>Pick another time</TextAction>
        </>
      ) : (
        <WindowPicker onPick={(w) => { actions.scheduleCheckIn(checkIn.id, w); setChanging(false); }} />
      )}
    </section>
  );
}

function WindowPicker({ onPick }: { onPick: (w: CheckInWindow) => void }) {
  const [windows] = useState(() => makeWindows());
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = windows.find((w) => w.id === selected);

  return (
    <div className="border-t border-ink">
      <fieldset>
        <legend className="px-4 pt-8 pb-4 display-md">When suits you?</legend>
        <div>
          {windows.map((w) => {
            const on = w.id === selected;
            return (
              <label key={w.id} className={`flex min-h-14 cursor-pointer items-center gap-3 border-t border-line px-4 py-3 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-brand-deep ${on ? "bg-ink text-paper has-[:focus-visible]:outline-paper" : "hover:bg-mist"}`}>
                <input type="radio" name="window" value={w.id} checked={on} onChange={() => setSelected(w.id)} className="sr-only" />
                <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-lime" : "border-ash-500"}`}>
                  {on && <span className="size-2.5 rounded-full bg-lime" />}
                </span>
                <span className="flex-1 font-medium">{w.label}</span>
                {w.label === "Right now" && <Tag tone="lime">Quickest</Tag>}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Bar arrow={!!chosen} disabled={!chosen} onClick={() => chosen && onPick(chosen)}>
        {chosen ? `Book ${chosen.label === "Right now" ? "for right now" : chosen.label}` : "Pick a time"}
      </Bar>
    </div>
  );
}
