import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Lot, demoLot, type Stall } from "@/components/ui/Lot";
import { ScanCount } from "@/components/ui/ScanCount";

const LOT = demoLot(72, { connected: 0.42, photo: 0.07, visit: 0.04, empty: 0.06 }, 11);
const PARKED = LOT.filter((x) => x !== "empty").length;

const LEGEND: { state: Stall; label: string; how: string }[] = [
  { state: "connected", label: "Connected car", how: "Telematics and registry, every day" },
  { state: "photo", label: "Check-in", how: "Dealer photographs a few random cars" },
  { state: "visit", label: "Spot check", how: "Unannounced visit, a few cars" },
];

const ROLES = [
  { href: "/dealer", kind: "Phone", title: "Dealer app", body: "A short check-in, at a time they pick.", tone: "bg-lime", icon: <PhoneIcon /> },
  { href: "/bank", kind: "Desktop", title: "Bank dashboard", body: "Portfolio, live alerts, sampling.", tone: "bg-brand", icon: <ChartIcon /> },
  { href: "/verifier", kind: "Phone", title: "Verifier", body: "Random spot checks, a few cars each.", tone: "bg-brand-soft", icon: <PinIcon /> },
  { href: "/demo", kind: "Stage", title: "Demo control", body: "Fire simulated events.", tone: "bg-paper", icon: <BoltIcon /> },
];

export default function Home() {
  return (
    <>
      <RoleSwitcher />
      <main>
        <section className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 pt-12 pb-16 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <h1 className="display-2xl text-[clamp(2.6rem,5.2vw,4.75rem)] text-balance animate-rise">Verify the floor without walking it.</h1>
            <p className="mt-6 max-w-xl text-lg text-ash-700 md:text-xl">Data first. Photos now and then. Visits last.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/bank" arrow>Open bank dashboard</ButtonLink>
              <ButtonLink href="/dealer" variant="secondary" arrow>Open dealer app</ButtonLink>
            </div>
          </div>

          <figure className="relative">
            <div className="relative overflow-hidden border border-ink bg-ink p-5 text-paper shadow-[10px_10px_0_0_var(--color-brand)] md:p-7">
              <div className="mb-4 flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium">Laakso Autot, Tampere</span>
                <span className="inline-flex items-baseline gap-1.5 text-paper/60">
                  <span className="size-2 self-center animate-pulse-dot bg-lime" aria-hidden />
                  <ScanCount stalls={LOT} cols={18} className="font-display text-lg font-semibold text-lime" />
                  <span>of {PARKED} verified today</span>
                </span>
              </div>
              <Lot stalls={LOT} cols={18} scan className="block w-full" title="Aerial view of a dealer lot, cars coloured by how they are verified" />
              {/* One pass of the scan over the lot on first paint; each car takes its colour as the beam crosses it. */}
              <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-scan">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-lime/15 to-transparent" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-lime/80" />
              </div>
            </div>
            <figcaption className="mt-4 grid gap-3 sm:grid-cols-3">
              {LEGEND.map((l) => (
                <div key={l.state} className="flex gap-2.5">
                  <span className={`mt-1 h-4 w-2.5 shrink-0 rounded-[2px] border border-ink ${l.state === "connected" ? "bg-lime" : l.state === "photo" ? "bg-brand" : "bg-paper"}`} aria-hidden />
                  <span className="text-sm leading-snug">
                    <span className="block font-medium">{l.label}</span>
                    <span className="text-ash-700">{l.how}</span>
                  </span>
                </div>
              ))}
            </figcaption>
          </figure>
        </section>

        <section className="border-t border-ink bg-mist">
          <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-14 md:grid-cols-2 md:px-8 xl:grid-cols-4">
            {ROLES.map((r) => (
              <a key={r.href} href={r.href} className="group block focus-visible:outline-none">
                <Card interactive className="flex h-full flex-col p-2">
                  <div className={`relative flex aspect-[16/9] flex-col justify-between border border-ink p-4 ${r.tone} ${r.tone === "bg-paper" ? "bay-lines-ink" : ""}`}>
                    <div className="flex items-start justify-between">
                      <span className="flex size-10 items-center justify-center border border-ink bg-paper transition-transform duration-300 group-hover:-rotate-6">{r.icon}</span>
                      <span className="border border-ink bg-ink px-1.5 py-0.5 text-xs text-paper">{r.kind}</span>
                    </div>
                    <span className="display-lg">{r.title}</span>
                  </div>
                  <p className="flex items-center justify-between gap-2 px-2 pt-4 pb-3 text-ash-700">
                    {r.body}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 text-ink transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"><path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg>
                  </p>
                </Card>
              </a>
            ))}
          </div>
        </section>

        <footer className="border-t border-ink">
          <div className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-2 px-4 py-6 text-sm text-ash-700 md:px-8">
            <span>Hackathon prototype. Fictional lender and dealers.</span>
            <span>All external data sources are simulated.</span>
          </div>
        </footer>
      </main>
    </>
  );
}

function PhoneIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><rect x="4.5" y="1.5" width="9" height="15" stroke="currentColor" strokeWidth="1.5" /><path d="M8 13.5h2" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
function ChartIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M2 16h14M4.5 13V8M9 13V3.5M13.5 13V6" stroke="currentColor" strokeWidth="1.8" /></svg>;
}
function PinIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M9 16.5s5.5-5 5.5-9a5.5 5.5 0 10-11 0c0 4 5.5 9 5.5 9z" stroke="currentColor" strokeWidth="1.5" /><circle cx="9" cy="7.5" r="1.8" fill="currentColor" /></svg>;
}
function BoltIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M10 1.5L3.5 10H9l-1 6.5L14.5 8H9l1-6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}
