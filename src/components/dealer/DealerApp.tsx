"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { TierBadge } from "@/components/ui/TierBadge";
import { actions, useDemo, useHydrated } from "@/lib/store";
import type { Tier } from "@/lib/types";
import { Inbox } from "./Inbox";
import { CaptureFlow } from "./CaptureFlow";
import { DoneScreen } from "./DoneScreen";
import { TierPage } from "./TierPage";
import { Transparency } from "./Transparency";

type Tab = "checkins" | "tier" | "rules";
const TABS: { id: Tab; label: string }[] = [
  { id: "checkins", label: "Check-ins" },
  { id: "tier", label: "Your tier" },
  { id: "rules", label: "What we check" },
];

export function DealerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper">
      <RoleSwitcher compact />
      <main className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-md bg-paper pb-16 sm:border-x sm:border-ink">{children}</main>
    </div>
  );
}

export function DealerSkeleton() {
  return (
    <DealerShell>
      <div className="animate-pulse" aria-hidden>
        <div className="h-14 border-b border-line" />
        <div className="space-y-3 px-4 pt-10 pb-6">
          <div className="h-4 w-1/3 bg-ash-100" />
          <div className="h-24 w-4/5 bg-ash-100" />
        </div>
        <div className="h-12 border-y border-ink" />
        <div className="space-y-4 px-4 pt-8">
          <div className="h-12 w-2/3 bg-ash-100" />
          <div className="h-56 w-full bg-ash-100" />
        </div>
      </div>
    </DealerShell>
  );
}

export function DealerApp() {
  const hydrated = useHydrated();
  const state = useDemo();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("checkins");
  const [done, setDone] = useState<{ id: string; tierBefore: Tier } | null>(null);

  useEffect(() => {
    // Dev-only hook so the flow can be driven from the console or a test script.
    if (process.env.NODE_ENV === "development") (window as unknown as { __actions: typeof actions }).__actions = actions;
  }, []);

  if (!hydrated) return <DealerSkeleton />;

  const dealer = state.dealers.find((d) => d.id === params.get("d")) ?? state.dealers.find((d) => d.id === "d1") ?? state.dealers[0];
  const open = state.checkIns.filter((c) => c.dealerId === dealer.id && c.status !== "completed");
  const active = open.find((c) => c.status === "in_progress");
  const doneCheckIn = done ? state.checkIns.find((c) => c.id === done.id && c.dealerId === dealer.id) : undefined;
  const showDone = !!doneCheckIn && doneCheckIn.status === "completed";
  const capturing = tab === "checkins" && !showDone && !!active;

  const selectDealer = (id: string) => {
    setDone(null);
    setTab("checkins");
    router.replace(`${pathname}?d=${id}`, { scroll: false });
  };

  return (
    <DealerShell>
      <div className="flex items-center gap-3 border-b border-line px-4 py-2">
        <label htmlFor="dealer-select" className="shrink-0 text-sm text-ash-700">Signed in as</label>
        <select
          id="dealer-select"
          value={dealer.id}
          onChange={(e) => selectDealer(e.target.value)}
          className="h-10 min-w-0 flex-1 appearance-none border border-line bg-paper bg-[length:10px] bg-[right_10px_center] bg-no-repeat px-2.5 pr-7 text-sm font-medium hover:border-ink"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23000' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")" }}
        >
          {state.dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* While a check-in is running the name steps aside so the camera sits higher on the screen. */}
      {!capturing && (
        <header className="px-4 pt-10 pb-6">
          <div className="flex items-center gap-2 text-sm text-ash-700">
            <TierBadge tier={dealer.tier} />
            <span>{dealer.city}</span>
          </div>
          <h1 className="mt-4 display-wide text-[clamp(2rem,9vw,2.75rem)] [overflow-wrap:anywhere]">{dealer.name}</h1>
        </header>
      )}

      {state.spotChecks
        .filter((v) => v.dealerId === dealer.id && v.verifier.status === "on_site")
        .map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-3 border-t border-ink bg-brand-soft px-4 py-3" role="status">
            <p className="text-sm"><b>{v.verifier.name}</b> from Curb visits today</p>
            <span className="shrink-0 border border-ink bg-paper px-2 py-1 figure text-lg tracking-[0.08em]" aria-label={`Visit code ${v.verifier.visitCode}`}>{v.verifier.visitCode}</span>
          </div>
        ))}

      <nav aria-label="Sections" className="sticky top-14 z-30 grid grid-cols-3 border-y border-ink bg-paper">
        {/* One ink block slides under the active tab. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-ink transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${TABS.findIndex((t) => t.id === tab) * 100}%)` }}
        />
        {TABS.map((t, i) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-12 items-center justify-center gap-1.5 px-1 text-center text-[0.8rem] leading-tight font-medium transition-colors duration-300 focus-visible:-outline-offset-4 ${i > 0 ? "border-l border-ink" : ""} ${on ? "text-paper focus-visible:outline-paper" : "hover:bg-brand-soft"}`}
            >
              {t.label}
              {t.id === "checkins" && open.length > 0 && (
                <span className={`inline-flex size-5 items-center justify-center tag-text ${on ? "bg-lime text-ink" : "bg-brand text-ink"}`}>{open.length}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div key={tab} className="animate-[tab-in_260ms_cubic-bezier(0.22,1,0.36,1)_both]">
        <style>{`@keyframes tab-in { from { opacity: 0; transform: translateY(6px) } }`}</style>
        {tab === "checkins" && (
          showDone ? (
            <DoneScreen checkIn={doneCheckIn!} dealer={dealer} tierBefore={done!.tierBefore} onBack={() => setDone(null)} onTier={() => setTab("tier")} />
          ) : active ? (
            <CaptureFlow
              key={active.id}
              checkIn={active}
              onComplete={() => {
                setDone({ id: active.id, tierBefore: dealer.tier });
                actions.completeCheckIn(active.id);
                window.scrollTo({ top: 0 });
              }}
            />
          ) : (
            <Inbox dealer={dealer} checkIns={open} onTier={() => setTab("tier")} />
          )
        )}
        {tab === "tier" && <TierPage dealer={dealer} />}
        {tab === "rules" && <Transparency />}
      </div>
    </DealerShell>
  );
}
