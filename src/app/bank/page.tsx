"use client";
import { useCallback, useEffect, useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SectionTag } from "@/components/ui/Card";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { dateFi } from "@/lib/format";
import { Headline } from "@/components/bank/Headline";
import { Portfolio } from "@/components/bank/Portfolio";
import { AlertFeed } from "@/components/bank/AlertFeed";
import { AlertDetail } from "@/components/bank/AlertDetail";
import { DealerDetail } from "@/components/bank/DealerDetail";
import { CostChart } from "@/components/bank/CostChart";
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
          <div className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8 md:pt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <SectionTag>Aurora Dealer Finance · Floor check</SectionTag>
                <h1 className="mt-2 display-xl">Portfolio today</h1>
              </div>
              <p className="tag-text text-ash-700">{dateFi(new Date().toISOString())} · live, simulated feeds</p>
            </div>
            <div className="mt-6">
              <Headline s={s} onAlerts={() => document.getElementById("alerts")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-[1400px] gap-8 px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
            <div className="order-2 min-w-0 space-y-12 lg:order-1">
              <section aria-label="Portfolio">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="display-lg">Dealers</h2>
                  <span className="tag-text text-ash-700">Click a dealer for detail</span>
                </div>
                <Portfolio s={s} onOpen={(id) => setPanel({ kind: "dealer", id })} />
              </section>
              <CostChart />
            </div>
            <aside id="alerts" className="order-1 min-w-0 scroll-mt-20 lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
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
    <main className="mx-auto max-w-[1400px] px-4 pt-10 md:px-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-4 w-48 bg-ash-100" />
      <div className="mt-3 h-12 w-80 bg-ash-100" />
      <div className="mt-6 h-56 border border-ash-300 bg-mist" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-64 border border-ash-300 bg-mist" />)}
        </div>
        <div className="h-96 border border-ash-300 bg-mist" />
      </div>
    </main>
  );
}
