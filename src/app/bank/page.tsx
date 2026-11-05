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

const WRAP = "mx-auto max-w-[1600px] px-4 md:px-8";

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
      <main className="overflow-x-clip pb-24">
        <header className={`${WRAP} flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-10 pb-8 md:pt-16 md:pb-10`}>
          <h1 className="display-wide text-[clamp(2.6rem,9.5vw,9rem)]">Portfolio</h1>
          <p className="flex items-center gap-2 pb-1 text-sm text-ash-700">
            <span className="size-2 animate-pulse-dot bg-go" aria-hidden />
            Live · {dateFi(new Date().toISOString())}
          </p>
        </header>

        {!hydrated ? (
          <Skeleton />
        ) : (
          <>
            <div className="border-t border-ink">
              <div className={WRAP}>
                <Headline s={s} onAlerts={() => document.getElementById("alerts")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
              </div>
            </div>

            <div className="border-y border-ink">
              <div className={`${WRAP} grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`}>
                <section aria-labelledby="dealers-h" className="order-2 min-w-0 border-t border-ink py-8 lg:order-1 lg:border-t-0 lg:py-10 lg:pr-8">
                  <h2 id="dealers-h" className="display-lg">Dealers</h2>
                  <div className="mt-6"><Portfolio s={s} onOpen={(id) => setPanel({ kind: "dealer", id })} /></div>
                </section>
                <aside id="alerts" className="order-1 min-w-0 scroll-mt-20 py-8 lg:order-2 lg:border-l lg:border-ink lg:py-10 lg:pl-8">
                  <AlertFeed s={s} selected={alert?.id ?? null} onSelect={(id) => setPanel({ kind: "alert", id })} />
                </aside>
              </div>
            </div>
          </>
        )}
      </main>

      <Drawer open={!!alert} onClose={close} label="Alert">
        {alert && <AlertDetail s={s} alert={alert} onDealer={(id) => setPanel({ kind: "dealer", id })} />}
      </Drawer>
      <Drawer open={!!dealer} onClose={close} label="Dealer" wide>
        {dealer && <DealerDetail s={s} d={dealer} onAlert={(id) => setPanel({ kind: "alert", id })} />}
      </Drawer>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="border-t border-ink">
        <div className={`${WRAP} grid md:grid-cols-4`}>
          {[0, 1, 2, 3].map((i) => <div key={i} className={`h-44 py-6 ${i ? "border-t border-ink md:border-t-0 md:border-l md:pl-6" : ""}`}><div className="h-full bg-mist" /></div>)}
        </div>
      </div>
      <div className="border-y border-ink">
        <div className={`${WRAP} py-10`}>
          <div className="h-8 w-48 bg-ash-100" />
          <div className="mt-6 divide-y divide-line border-y border-line">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-[68px] bg-mist" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
