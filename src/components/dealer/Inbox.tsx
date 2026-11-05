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
    <div className="animate-rise">
      <Card className="p-5">
        <div className="flex size-11 items-center justify-center border border-ink bg-lime" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
        </div>
        <h2 className="mt-4 display-lg">All good. Nothing to do.</h2>
      </Card>

      <button type="button" onClick={onTier} className="group mt-5 block w-full text-left">
        <Card className="p-5 transition-colors group-hover:bg-brand-soft">
          <div className="flex items-center justify-between gap-3">
            <span className="tag-text text-ash-700">Your tier</span>
            <TierBadge tier={dealer.tier} />
          </div>
          <dl className="mt-4 divide-y divide-ash-300 border-y border-ash-300 text-sm">
            {t.topUp.amount > 0 && (
              <div className="flex justify-between gap-3 py-2.5"><dt className="text-ash-700">Credit-line top-up</dt><dd className="font-medium">{eur(t.topUp.amount)}</dd></div>
            )}
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-ash-700">Checks</dt><dd className="font-medium">{FREQUENCY[dealer.tier]}</dd></div>
          </dl>
          <span className="mt-3 inline-block text-sm font-medium underline underline-offset-4">Benefits →</span>
        </Card>
      </button>
    </div>
  );
}

function Chips({ targeted }: { targeted: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {[targeted ? "1 car" : "A few cars", targeted ? "~1 min" : "~5 min", "3 photos a car", "On your lot"].map((c) => (
        <li key={c}><Tag tone="outline">{c}</Tag></li>
      ))}
    </ul>
  );
}

function CheckInCard({ checkIn }: { checkIn: CheckIn; dealer: Dealer }) {
  const [changing, setChanging] = useState(false);
  const targeted = checkIn.reason === "targeted";
  const scheduled = checkIn.status === "scheduled" && checkIn.window && !changing;

  return (
    <Card className="animate-rise overflow-hidden">
      <div className={`border-b border-ink px-5 py-4 ${scheduled ? "bg-lime" : "bg-brand"}`}>
        <Tag tone="ink">{scheduled ? "Booked" : "Pick a time"}</Tag>
        <p className="mt-3 display-lg">{scheduled ? bookedLabel(checkIn.window!) : targeted ? "One quick photo" : "Quick check-in"}</p>
      </div>

      {scheduled ? (
        <div className="p-5">
          <Chips targeted={targeted} />
          <Button variant="primary" arrow className="mt-5 min-h-14 w-full text-base" onClick={() => { actions.startCheckIn(checkIn.id); window.scrollTo({ top: 0 }); }}>
            Start check-in
          </Button>
          <button type="button" onClick={() => setChanging(true)} className="mt-3 min-h-11 w-full text-sm font-medium underline underline-offset-4">
            Pick another time
          </button>
        </div>
      ) : (
        <WindowPicker
          targeted={targeted}
          onPick={(w) => { actions.scheduleCheckIn(checkIn.id, w); setChanging(false); }}
        />
      )}
    </Card>
  );
}

function WindowPicker({ targeted, onPick }: { targeted: boolean; onPick: (w: CheckInWindow) => void }) {
  const [windows] = useState(() => makeWindows());
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = windows.find((w) => w.id === selected);

  return (
    <div className="p-5">
      <Chips targeted={targeted} />
      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">When suits you?</legend>
        <div className="divide-y divide-ink border border-ink">
          {windows.map((w) => {
            const on = w.id === selected;
            return (
              <label key={w.id} className={`flex min-h-13 cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${on ? "bg-brand-soft" : "hover:bg-mist"}`}>
                <input type="radio" name="window" value={w.id} checked={on} onChange={() => setSelected(w.id)} className="peer sr-only" />
                <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center border border-ink ${on ? "bg-ink" : "bg-paper"}`}>
                  {on && <span className="size-2 bg-lime" />}
                </span>
                <span className="flex-1 font-medium">{w.label}</span>
                {w.label === "Right now" && <Tag tone="lime">Quickest</Tag>}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Button variant="primary" arrow disabled={!chosen} className="mt-5 min-h-14 w-full text-base" onClick={() => chosen && onPick(chosen)}>
        {chosen ? `Book ${chosen.label === "Right now" ? "for right now" : chosen.label}` : "Pick a time"}
      </Button>
      <p className="mt-3 text-center text-xs text-ash-700">You can change it later.</p>
    </div>
  );
}
