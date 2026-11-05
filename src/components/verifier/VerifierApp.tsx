"use client";
import { useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Odometer } from "@/components/ui/Odometer";
import { actions, useDemo, useHydrated, type Store } from "@/lib/store";
import { eur, timeFi } from "@/lib/format";
import { ActiveVisit } from "./ActiveVisit";
import { OfferCard } from "./OfferCard";
import { Reported } from "./Reported";
import { confirmed, ScreenTitle, type Job } from "./shared";

/**
 * The freelancer's phone app. A vetted local person takes a paid spot check: an unannounced visit
 * to a dealer lot to confirm a few random cars. Every visit looks the same, whether it is routine
 * or was brought forward by an alert, so visits stay neutral and can't be "tipped".
 *
 * Home shows earnings and offers. Once a visit is accepted the screen belongs to that visit:
 * a compact header, the cars to find, and one action in a bar at the bottom.
 */

function jobsOf(s: Store): Job[] {
  return s.spotChecks
    .map((v) => ({
      visit: v,
      dealer: s.dealers.find((d) => d.id === v.dealerId)!,
      cars: v.sampledVins.map((vin) => s.cars.find((c) => c.vin === vin)!),
    }))
    .sort((a, b) => Date.parse(b.visit.verifier.dispatchedAt) - Date.parse(a.visit.verifier.dispatchedAt));
}

function VerifierShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-paper">
      <RoleSwitcher compact />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col border-ink bg-paper sm:border-x">{children}</main>
    </div>
  );
}

export function VerifierApp() {
  const hydrated = useHydrated();
  const s = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const [declined, setDeclined] = useState<string[]>([]);

  if (!hydrated) {
    return (
      <VerifierShell>
        <div aria-hidden className="animate-pulse">
          <div className="px-4 pt-10 pb-6"><div className="h-14 w-3/4 bg-ash-100" /></div>
          <div className="h-28 border-y border-ink" />
          <div className="m-4 h-44 bg-ash-100" />
        </div>
      </VerifierShell>
    );
  }

  const jobs = jobsOf(s);
  const active = jobs.find((j) => j.visit.id === openId) ?? jobs.find((j) => j.visit.verifier.status === "en_route" || j.visit.verifier.status === "on_site");
  const offered = jobs.filter((j) => j.visit.verifier.status === "offered" && !declined.includes(j.visit.id));
  const done = jobs.filter((j) => j.visit.verifier.status === "reported" && !j.visit.verifier.simulated);
  const earned = done.reduce((sum, j) => sum + j.visit.verifier.fee, 0);
  const me = active?.visit.verifier.name ?? offered[0]?.visit.verifier.name ?? "Sanna M.";

  if (active && active.visit.verifier.status !== "reported") {
    return <VerifierShell><ActiveVisit key={active.visit.id} job={active} s={s} /></VerifierShell>;
  }
  if (active) {
    return <VerifierShell><Reported job={active} onClose={() => setOpenId(null)} /></VerifierShell>;
  }

  return (
    <VerifierShell>
      <ScreenTitle>Hi {me.split(" ")[0]}</ScreenTitle>
      <dl className="grid grid-cols-2 border-y border-ink">
        <div className="px-4 py-5">
          <dt className="text-sm text-ash-700">Earned today</dt>
          <dd className="mt-3 figure text-5xl"><Odometer value={eur(earned)} /></dd>
        </div>
        <div className="border-l border-ink px-4 py-5">
          <dt className="text-sm text-ash-700">Visits done</dt>
          <dd className="mt-3 figure text-5xl"><Odometer value={done.length} /></dd>
        </div>
      </dl>

      <section aria-labelledby="near" className="pb-4">
        <h2 id="near" className="px-4 pt-12 pb-5 display-lg">Near you</h2>
        {offered.length === 0 ? (
          <div className="border-t border-ink px-4 py-8">
            <p className="display-md text-ash-700">Nothing nearby</p>
            <a href="/demo" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4" target="_blank" rel="noreferrer">Post one from the demo panel ↗</a>
          </div>
        ) : (
          <ul className="border-b border-ink">
            {offered.map((j) => (
              <li key={j.visit.id} className="border-t border-ink">
                <OfferCard job={j} onAccept={() => { actions.verifierAccept(j.visit.id); setOpenId(j.visit.id); }} onDecline={() => setDeclined((d) => [...d, j.visit.id])} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section aria-labelledby="done" className="pb-16">
          <h2 id="done" className="px-4 pt-12 pb-5 display-lg">Done today</h2>
          <ul className="divide-y divide-line border-y border-ink">
            {done.map((j) => (
              <li key={j.visit.id} className="flex items-center justify-between gap-3 px-4 py-4">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{j.dealer.name}</span>
                  <span className="mt-0.5 block text-sm text-ash-700">{j.cars.filter((c) => confirmed(j.visit.results[c.vin])).length} of {j.cars.length} found · {timeFi(j.visit.verifier.reportedAt!)}</span>
                </span>
                <span className="shrink-0 figure text-2xl">+{eur(j.visit.verifier.fee)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </VerifierShell>
  );
}
