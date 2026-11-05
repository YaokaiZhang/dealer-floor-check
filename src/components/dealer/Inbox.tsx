"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { TierBadge } from "@/components/ui/TierBadge";
import { TIERS } from "@/config/tiers";
import { eur } from "@/lib/format";
import { actions } from "@/lib/store";
import type { CheckIn, CheckInWindow, Dealer } from "@/lib/types";
import { FREQUENCY } from "./tierCopy";
import { bookedLabel, makeWindows } from "./windows";

export function Inbox({ dealer, checkIns, onTier }: { dealer: Dealer; checkIns: CheckIn[]; onTier: () => void }) {
  if (checkIns.length === 0) return <EmptyInbox dealer={dealer} onTier={onTier} />;
  return (
    <div className="space-y-5">
      {checkIns.map((ci) => <CheckInCard key={ci.id} checkIn={ci} dealer={dealer} />)}
    </div>
  );
}

function EmptyInbox({ dealer, onTier }: { dealer: Dealer; onTier: () => void }) {
  const t = TIERS[dealer.tier];
  return (
    <div>
      <div className="flex items-center gap-4 border border-line bg-lime p-5">
        <span className="flex size-12 shrink-0 items-center justify-center bg-ink text-lime" aria-hidden>
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>
        </span>
        <h2 className="display-md">All good. Nothing to do.</h2>
      </div>

      <button type="button" onClick={onTier} className="group mt-4 block w-full border border-line p-5 text-left transition-colors hover:bg-brand-soft">
        <span className="flex items-center justify-between gap-3">
          <span className="font-medium">Your tier</span>
          <TierBadge tier={dealer.tier} />
        </span>
        <dl className="mt-3 divide-y divide-ash-300 border-y border-ash-300 text-sm">
          {t.topUp.amount > 0 && (
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-ash-700">Credit-line top-up</dt><dd className="font-medium">{eur(t.topUp.amount)}</dd></div>
          )}
          <div className="flex justify-between gap-3 py-2.5"><dt className="text-ash-700">Checks</dt><dd className="text-right font-medium">{FREQUENCY[dealer.tier]}</dd></div>
        </dl>
        <span className="mt-3 inline-flex min-h-6 items-center gap-1 text-sm font-medium underline underline-offset-4">Benefits <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span></span>
      </button>
    </div>
  );
}

/** What the dealer is signing up for, in one plain sentence. */
function Ask({ targeted, className = "text-ash-700" }: { targeted: boolean; className?: string }) {
  return (
    <p className={className}>
      {targeted ? "One car, three photos. About a minute on your lot." : "A few cars, three photos each. About 5 minutes on your lot."}
    </p>
  );
}

function CheckInCard({ checkIn }: { checkIn: CheckIn; dealer: Dealer }) {
  const [changing, setChanging] = useState(false);
  const targeted = checkIn.reason === "targeted";
  const scheduled = checkIn.status === "scheduled" && checkIn.window && !changing;
  const title = targeted ? "One quick photo" : "Quick check-in";

  if (scheduled) {
    const label = bookedLabel(checkIn.window!);
    return (
      <Card className="animate-rise overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line bg-lime px-5 py-3">
          <span className="flex size-6 shrink-0 items-center justify-center bg-ink text-lime" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" /></svg>
          </span>
          <p className="font-medium">Booked for {label}</p>
        </div>
        <div className="p-5">
          <h2 className="display-lg">{title}</h2>
          <Ask targeted={targeted} className="mt-2 text-ash-700" />
          <Button variant="primary" arrow className="mt-5 min-h-14 w-full text-base" onClick={() => { actions.startCheckIn(checkIn.id); window.scrollTo({ top: 0 }); }}>
            Start check-in
          </Button>
          <button type="button" onClick={() => setChanging(true)} className="mt-2 min-h-11 w-full text-sm font-medium text-ash-700 underline underline-offset-4">
            Pick another time
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-rise overflow-hidden">
      <div className="border-b border-line bg-brand px-5 py-4">
        <h2 className="display-lg">{title}</h2>
        <Ask targeted={targeted} className="mt-1.5" />
      </div>
      <WindowPicker onPick={(w) => { actions.scheduleCheckIn(checkIn.id, w); setChanging(false); }} />
    </Card>
  );
}

function WindowPicker({ onPick }: { onPick: (w: CheckInWindow) => void }) {
  const [windows] = useState(() => makeWindows());
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = windows.find((w) => w.id === selected);

  return (
    <div className="p-5">
      <fieldset>
        <legend className="mb-2 font-medium">When suits you?</legend>
        <div className="divide-y divide-line border border-line">
          {windows.map((w) => {
            const on = w.id === selected;
            return (
              <label key={w.id} className={`flex min-h-13 cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-brand-deep ${on ? "bg-ink text-paper" : "hover:bg-mist"}`}>
                <input type="radio" name="window" value={w.id} checked={on} onChange={() => setSelected(w.id)} className="sr-only" />
                <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-lime" : "border-line"}`}>
                  {on && <span className="size-2.5 rounded-full bg-lime" />}
                </span>
                <span className="flex-1 font-medium">{w.label}</span>
                {w.label === "Right now" && <Tag tone="lime">Quickest</Tag>}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Button variant="primary" arrow={!!chosen} disabled={!chosen} className="mt-5 min-h-14 w-full text-base" onClick={() => chosen && onPick(chosen)}>
        {chosen ? `Book ${chosen.label === "Right now" ? "for right now" : chosen.label}` : "Pick a time above"}
      </Button>
      <p className="mt-3 text-center text-xs text-ash-700">You can change it later.</p>
    </div>
  );
}
