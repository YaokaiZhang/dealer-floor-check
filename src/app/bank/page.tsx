"use client";
import { useCallback, useEffect, useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { dateFi } from "@/lib/format";
import { Headline } from "@/components/bank/Headline";
import { Portfolio } from "@/components/bank/Portfolio";
import { AlertFeed } from "@/components/bank/AlertFeed";
import { AlertDetail } from "@/components/bank/AlertDetail";
import { DealerDetail } from "@/components/bank/DealerDetail";
import { Drawer } from "@/components/bank/Drawer";

type Panel = { kind: "alert" | "dealer"; id: string } | null;

export default function BankPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const [panel, setPanel] = useState<Panel>(null);
  const close = useCallback(() => setPanel(null), []);

  useEffect(() => {
    // Dev-only hook so screenshots / rehearsals can fire store actions from the console.
    if (process.env.NODE_ENV === "development") (window as unknown as { __actions: typeof actions }).__actions = actions;
  }, []);

  const alert = panel?.kind === "alert" ? s.alerts.find((a) => a.id === panel.id) : undefined;
  const dealer = panel?.kind === "dealer" ? s.dealers.find((d) => d.id === panel.id) : undefined;

  return (
    <>
      <RoleSwitcher />
      {!hydrated ? (
        <Skeleton />
      ) : (
        <main className="pb-20">
          <div className="mx-auto max-w-[1400px] px-4 pt-6 md:px-8 md:pt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="display-lg">Portfolio today</h1>
              <p className="flex items-center gap-2 text-sm text-ash-700">
                <span className="size-2 animate-pulse-dot bg-lime outline outline-1 outline-ink" aria-hidden />
                {dateFi(new Date().toISOString())}, simulated feeds
              </p>
            </div>
            <div className="mt-4">
              <Headline s={s} onAlerts={() => document.getElementById("alerts")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
            </div>
          </div>

          {/* 22fr / 14fr lines the alerts column up with the last two headline tiles (5/12 + 7/12 split in thirds). */}
          <div className="mx-auto mt-8 grid max-w-[1400px] gap-8 px-4 md:px-8 lg:grid-cols-[minmax(0,22fr)_minmax(0,14fr)] lg:gap-x-0">
            <div className="order-2 min-w-0 lg:order-1 lg:pr-8">
              <section aria-labelledby="dealers-h">
                <h2 id="dealers-h" className="mb-3 display-md">Dealers</h2>
                <Portfolio s={s} onOpen={(id) => setPanel({ kind: "dealer", id })} />
              </section>
            </div>
            <aside id="alerts" className="order-1 min-w-0 scroll-mt-20 lg:order-2">
              <AlertFeed s={s} selected={alert?.id ?? null} onSelect={(id) => setPanel({ kind: "alert", id })} />
            </aside>
          </div>
        </main>
      )}

      <Drawer open={!!alert} onClose={close} label="Alert detail">
        {alert && <AlertDetail s={s} alert={alert} onDealer={(id) => setPanel({ kind: "dealer", id })} />}
      </Drawer>
      <Drawer open={!!dealer} onClose={close} label="Dealer detail" wide>
        {dealer && <DealerDetail s={s} d={dealer} onAlert={(id) => setPanel({ kind: "alert", id })} />}
      </Drawer>
    </>
  );
}

function Skeleton() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-6 md:px-8 md:pt-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-9 w-64 bg-ash-100" />
      <div className="mt-4 h-52 border border-ash-300 bg-mist" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,22fr)_minmax(0,14fr)] lg:gap-x-0">
        <div className="lg:pr-8">
          <div className="h-6 w-28 bg-ash-100" />
          <div className="mt-3 divide-y divide-ash-300 border border-ash-300">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-[68px] bg-mist" />)}
          </div>
        </div>
        <div className="h-96 border border-ash-300 bg-mist" />
      </div>
    </main>
  );
}
