"use client";
import { useMemo, useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { TierBadge } from "@/components/ui/TierBadge";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { portfolioStats } from "@/lib/risk";
import { timeFi } from "@/lib/format";
import type { Car } from "@/lib/types";

const carOption = (c: Car) => `${c.vin} · ${c.make} ${c.model} · ${c.plate}`;

export default function DemoPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const demoCar = s.cars.find((c) => c.vin === s.demo.soldCarVin)!;
  const demoDealer = s.dealers.find((d) => d.id === demoCar.dealerId)!;

  const inStock = useMemo(() => s.cars.filter((c) => c.status === "in_stock"), [s.cars]);
  const connected = useMemo(() => inStock.filter((c) => c.connected), [inStock]);
  const [marketVin, setMarketVin] = useState(s.demo.soldCarVin);
  const [registryVin, setRegistryVin] = useState(inStock.find((c) => c.dealerId === "d4")?.vin ?? inStock[0].vin);
  const [geoVin, setGeoVin] = useState(connected.find((c) => c.dealerId === "d3")?.vin ?? connected[0].vin);
  const [flash, setFlash] = useState<string | null>(null);

  const fire = (label: string, fn: () => void) => {
    fn();
    setFlash(label);
    setTimeout(() => setFlash((f) => (f === label ? null : f)), 2200);
  };
  const scenarioFired = s.alerts.some((a) => a.vin === s.demo.soldCarVin);

  return (
    <>
      <RoleSwitcher />
      <main className="overflow-x-clip pb-20">
        <header className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 pt-10 pb-8 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:pt-14 lg:pb-10">
          <h1 className="display-wide text-[clamp(2.5rem,7vw,6.5rem)]">Demo</h1>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/verifier" variant="secondary" arrow>Verifier</ButtonLink>
            <ButtonLink href="/demo/plates" variant="secondary" arrow>VIN plates</ButtonLink>
            <Button variant="danger" onClick={() => { if (confirm("Reset the demo to seed data?")) fire("Demo reset", () => void actions.reset()); }}>Reset demo</Button>
          </div>
        </header>

        <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex sm:right-auto">
          {flash && <Tag tone="lime" className="animate-rise px-3 py-2 text-sm">✓ {flash}</Tag>}
        </div>

        {/* Scripted scenario */}
        <section className="border-t border-ink" aria-labelledby="scenario">
          <div className="mx-auto grid max-w-[1600px] md:grid-cols-[1fr_auto] lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-5 px-4 py-8 md:px-8 md:py-12">
              <span className="text-sm text-ash-700">Step 3</span>
              <h2 id="scenario" className="display-wide text-[clamp(2rem,4.5vw,4.25rem)]">Sold out<br />of trust</h2>
              <p>
                {demoCar.year} {demoCar.make} {demoCar.model} · {demoCar.plate} · {demoDealer.name}
                <span className="mt-1 block tag-text break-all text-ash-700">{demoCar.vin}</span>
              </p>
            </div>
            <div className="flex flex-col justify-end gap-3 border-t border-ink px-4 py-8 md:min-w-72 md:border-t-0 md:border-l md:px-8 md:py-12 lg:items-start [&>*]:lg:min-w-72">
              <Button variant="primary" arrow disabled={hydrated && scenarioFired} onClick={() => fire("Marketplace: listed as sold", () => actions.marketplaceSold(s.demo.soldCarVin))}>
                {hydrated && scenarioFired ? "Scenario fired" : "Fire: listed as sold"}
              </Button>
              <ButtonLink href="/bank" variant="secondary" arrow>Watch on the bank</ButtonLink>
            </div>
          </div>
        </section>

        <div className="border-y border-ink">
          <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[1.4fr_1fr]">
            <div className="min-w-0 lg:border-r lg:border-ink">
              {/* Check-ins */}
              <section aria-labelledby="checkins">
                <SectionHead id="checkins">Check-ins</SectionHead>
                <ul className="divide-y divide-line border-t border-line">
                  {s.dealers.map((d) => {
                    const st = portfolioStats(s, d.id);
                    const open = s.checkIns.filter((c) => c.dealerId === d.id && c.status !== "completed").length;
                    const visit = s.spotChecks.find((v) => v.dealerId === d.id && v.verifier.status !== "reported");
                    const status = hydrated ? [open ? `${open} check-in${open > 1 ? "s" : ""}` : "", visit ? "visit open" : ""].filter(Boolean).join(" · ") : "";
                    return (
                      <li key={d.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 font-medium">{d.name} {hydrated && <TierBadge tier={d.tier} />}</p>
                          <p className="mt-1 tag-text text-ash-700">
                            {d.city} · {st.cars.length} cars{status && <span className="text-ink"> · {status}</span>}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button variant="secondary" className="py-1.5" onClick={() => fire(`Check-in sent to ${d.name}`, () => actions.sendCheckIn(d.id))}>
                            Send check-in
                          </Button>
                          <Button variant="secondary" className="py-1.5" disabled={hydrated && !!visit} onClick={() => fire(`Spot check posted for ${d.name}`, () => actions.sendSpotCheck(d.id))}>
                            Spot check
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Feeds */}
              <section className="border-t border-ink" aria-labelledby="feeds">
                <SectionHead id="feeds">Signals</SectionHead>
                <ul className="divide-y divide-line border-t border-line">
                  <FeedRow
                    source="Marketplace" tone="bg-brand-deep"
                    cars={inStock} vin={marketVin} onVin={setMarketVin}
                    buttons={[
                      { label: "Listed as sold", run: () => fire("Marketplace: sold", () => actions.marketplaceSold(marketVin, "sold")) },
                      { label: "Listing removed", run: () => fire("Marketplace: removed", () => actions.marketplaceSold(marketVin, "removed")) },
                    ]}
                  />
                  <FeedRow
                    source="Registry" tone="bg-high"
                    cars={inStock} vin={registryVin} onVin={setRegistryVin}
                    buttons={[{ label: "Owner change", run: () => fire("Registry: owner change", () => actions.registryOwnerChange(registryVin)) }]}
                  />
                  <FeedRow
                    source="Connected car" tone="bg-go"
                    cars={connected} vin={geoVin} onVin={setGeoVin}
                    buttons={[
                      { label: "Leaves geofence > 48 h", run: () => fire("Connected car: left geofence", () => actions.connectedLeavesGeofence(geoVin)) },
                      { label: "Odometer +742 km", run: () => fire("Connected car: odometer jump", () => actions.connectedOdometerJump(geoVin)) },
                    ]}
                  />
                </ul>
              </section>

              {/* Flags */}
              <section className="border-t border-ink" aria-labelledby="helpers">
                <SectionHead id="helpers">Stage helpers</SectionHead>
                <ul className="divide-y divide-line border-t border-line">
                  <Toggle label="Simulate on-site location" checked={hydrated && s.flags.simulateOnSite} onChange={(v) => actions.setFlag("simulateOnSite", v)} />
                  <Toggle label="Run the schedule" note="1 year ≈ 10 min" checked={hydrated && s.flags.autoSchedule} onChange={(v) => actions.setFlag("autoSchedule", v)} />
                  <Toggle label="Auto-complete spot checks" note="~6 s" checked={hydrated && s.flags.autoVerifier} onChange={(v) => actions.setFlag("autoVerifier", v)} />
                  <Toggle label="Demo camera fallback" checked={hydrated && s.flags.demoCamera} onChange={(v) => actions.setFlag("demoCamera", v)} />
                  <Toggle label="Next photo can't be read" note="One time" checked={hydrated && s.flags.nextPhotoUnreadable} onChange={(v) => actions.setFlag("nextPhotoUnreadable", v)} />
                </ul>
              </section>
            </div>

            {/* Event log */}
            <aside className="min-w-0 border-t border-ink lg:sticky lg:top-16 lg:self-start lg:border-t-0" aria-labelledby="log">
              <SectionHead id="log">Event log</SectionHead>
              <ol className="max-h-[70vh] divide-y divide-line overflow-auto border-t border-line">
                {hydrated && s.events.map((e) => (
                  <li key={e.id} className="flex gap-4 px-4 py-3 text-sm animate-rise md:px-8">
                    <span className="shrink-0 tag-text pt-0.5 text-ash-500 tabular-nums">{timeFi(e.at)}</span>
                    <span>{e.text}</span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

function SectionHead({ id, children }: { id: string; children: string }) {
  return <h2 id={id} className="display-lg px-4 pt-8 pb-5 md:px-8 md:pt-10 md:pb-6">{children}</h2>;
}

function FeedRow({ source, tone, cars, vin, onVin, buttons }: {
  source: string; tone: string; cars: Car[]; vin: string; onVin: (v: string) => void;
  buttons: { label: string; run: () => void }[];
}) {
  const s = useDemo();
  const id = `vin-${source.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <li className="flex flex-col gap-3 px-4 py-5 md:px-8">
      <label htmlFor={id} className="flex items-center gap-2 display-md">
        <span aria-hidden className={`size-2.5 shrink-0 ${tone}`} />
        {source}
      </label>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <select
          id={id}
          value={vin}
          onChange={(e) => onVin(e.target.value)}
          className="w-full min-w-0 flex-1 border border-ink bg-paper px-2 py-2 text-sm"
        >
          {s.dealers.map((d) => (
            <optgroup key={d.id} label={d.name}>
              {cars.filter((c) => c.dealerId === d.id).map((c) => (
                <option key={c.vin} value={c.vin}>{carOption(c)}{c.demoScenario ? " ★" : ""}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {buttons.map((b) => (
            <Button key={b.label} variant="primary" className="py-2" onClick={b.run}>{b.label}</Button>
          ))}
        </div>
      </div>
    </li>
  );
}

function Toggle({ label, note, checked, onChange }: { label: string; note?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <li>
      <label className="flex cursor-pointer items-center justify-between gap-6 px-4 py-4 md:px-8">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-medium">{label}</span>
          {note && <span className="tag-text text-ash-700">{note}</span>}
        </span>
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span aria-hidden className="relative h-6 w-11 shrink-0 border border-ink bg-paper transition-colors peer-checked:bg-brand-deep peer-checked:border-brand-deep peer-checked:after:bg-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-deep after:absolute after:top-0.5 after:left-0.5 after:size-[18px] after:bg-ink after:transition-transform peer-checked:after:translate-x-5" />
      </label>
    </li>
  );
}
