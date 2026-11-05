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
    <div className="min-h-dvh bg-mist">
      <RoleSwitcher compact />
      <main className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-md border-x border-ink bg-paper pb-16">{children}</main>
    </div>
  );
}

export function DealerSkeleton() {
  return (
    <DealerShell>
      <div className="animate-pulse space-y-4 p-4" aria-hidden>
        <div className="h-10 w-full bg-ash-100" />
        <div className="h-12 w-2/3 bg-ash-100" />
        <div className="h-11 w-full bg-ash-100" />
        <div className="h-56 w-full bg-ash-100" />
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

  const selectDealer = (id: string) => {
    setDone(null);
    setTab("checkins");
    router.replace(`${pathname}?d=${id}`, { scroll: false });
  };

  return (
    <DealerShell>
      <div className="flex items-center justify-between gap-3 border-b border-ink px-4 py-2.5">
        <label htmlFor="dealer-select" className="tag-text text-ash-700">Signed in as</label>
        <select
          id="dealer-select"
          value={dealer.id}
          onChange={(e) => selectDealer(e.target.value)}
          className="h-9 min-w-0 flex-1 appearance-none border border-ink bg-paper bg-[length:10px] bg-[right_10px_center] bg-no-repeat px-2.5 pr-7 text-sm font-medium"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23000' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")" }}
        >
          {state.dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <section className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <TierBadge tier={dealer.tier} />
          <span className="tag-text text-ash-700">{dealer.city}</span>
        </div>
        <h1 className="mt-3 display-xl">Hi {dealer.name}</h1>
      </section>

      {state.alerts
        .filter((a) => a.dealerId === dealer.id && a.verifier?.status === "on_site")
        .map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 border-t border-ink bg-brand-soft px-4 py-3" role="status">
            <p className="text-sm"><b>{a.verifier!.name}</b> from Aurora visits today</p>
            <span className="shrink-0 border border-ink bg-paper px-2 py-1 font-mono text-sm font-medium tracking-[0.12em]">{a.verifier!.visitCode}</span>
          </div>
        ))}

      <nav aria-label="Sections" className="sticky top-14 z-30 grid grid-cols-3 border-y border-ink bg-paper">
        {TABS.map((t, i) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-12 items-center justify-center gap-1.5 px-1 text-center text-[0.8rem] leading-tight font-medium transition-colors ${i > 0 ? "border-l border-ink" : ""} ${on ? "bg-ink text-paper" : "hover:bg-brand-soft"}`}
            >
              {t.label}
              {t.id === "checkins" && open.length > 0 && (
                <span className={`inline-flex size-5 items-center justify-center tag-text ${on ? "bg-lime text-ink" : "bg-brand text-ink"}`}>{open.length}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 pt-5">
        {tab === "checkins" && (
          doneCheckIn && doneCheckIn.status === "completed" ? (
            <DoneScreen checkIn={doneCheckIn} dealer={dealer} tierBefore={done!.tierBefore} onBack={() => setDone(null)} onTier={() => setTab("tier")} />
          ) : active ? (
            <CaptureFlow
              key={active.id}
              checkIn={active}
              dealer={dealer}
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
