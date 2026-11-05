"use client";
import { useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Odometer } from "@/components/ui/Odometer";
import { actions, useDemo, useHydrated, type Store } from "@/lib/store";
import { eur, timeFi } from "@/lib/format";
import { ActiveVisit } from "./ActiveVisit";
import { OfferCard } from "./OfferCard";
import { Reported } from "./Reported";
import { confirmed, type Job } from "./shared";

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
    <div className="min-h-dvh bg-mist">
      <RoleSwitcher compact />
      <main className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-md border-x border-line bg-paper">{children}</main>
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
        <div aria-hidden>
          <div className="h-48 border-b border-line bg-brand-soft" />
          <div className="animate-pulse space-y-3 p-4">
            <div className="h-6 w-1/2 bg-ash-100" />
            <div className="h-44 w-full bg-ash-100" />
          </div>
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
      <section className="border-b border-line bg-brand px-4 pt-6 pb-5 bay-lines-ink">
        <h1 className="display-xl">Hi {me.split(" ")[0]}</h1>
        <dl className="mt-4 grid grid-cols-2 border border-line bg-paper">
          <div className="px-3 py-2.5">
            <dt className="text-xs text-ash-700">Earned today</dt>
            <dd className="mt-1 figure text-3xl"><Odometer value={eur(earned)} /></dd>
          </div>
          <div className="border-l border-line px-3 py-2.5">
            <dt className="text-xs text-ash-700">Visits done</dt>
            <dd className="mt-1 figure text-3xl"><Odometer value={done.length} /></dd>
          </div>
        </dl>
      </section>

      <div className="space-y-8 px-4 pt-6 pb-16">
        <section>
          <h2 className="mb-3 display-md">Spot checks near you</h2>
          {offered.length === 0 ? (
            <div className="border border-dashed border-ash-500 px-4 py-6">
              <p className="font-medium">Nothing nearby right now</p>
              <p className="mt-1 text-sm text-ash-700">New visits show up here.</p>
              <a href="/demo" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4" target="_blank" rel="noreferrer">Post one from the demo panel ↗</a>
            </div>
          ) : (
            <ul className="space-y-4">
              {offered.map((j) => (
                <li key={j.visit.id}>
                  <OfferCard job={j} onAccept={() => { actions.verifierAccept(j.visit.id); setOpenId(j.visit.id); }} onDecline={() => setDeclined((d) => [...d, j.visit.id])} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="mb-3 display-md">Done today</h2>
            <ul className="divide-y divide-ash-300 border-y border-line">
              {done.map((j) => (
                <li key={j.visit.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{j.dealer.name}</span>
                    <span className="block text-sm text-ash-700">{j.cars.filter((c) => confirmed(j.visit.results[c.vin])).length} of {j.cars.length} found</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block figure text-xl">+{eur(j.visit.verifier.fee)}</span>
                    <span className="block font-mono text-xs text-ash-700">{timeFi(j.visit.verifier.reportedAt!)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="max-w-[32ch] text-sm text-ash-700">Visits are unannounced, take about 30 minutes, and pay whether the cars are there or not.</p>
      </div>
    </VerifierShell>
  );
}
