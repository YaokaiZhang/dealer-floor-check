"use client";
import { useMemo, useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, SectionTag } from "@/components/ui/Card";
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
      <main className="mx-auto max-w-[1400px] px-4 pt-10 pb-20 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionTag>Stage control · simulated feeds</SectionTag>
            <h1 className="mt-3 display-xl">Demo control</h1>
            <p className="mt-3 tag-text text-ash-700">Live on every device connected to this server</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/verifier" variant="secondary" arrow>Verifier app</ButtonLink>
            <ButtonLink href="/demo/plates" variant="secondary" arrow>VIN plates to photograph</ButtonLink>
            <Button variant="danger" onClick={() => { if (confirm("Reset the demo to seed data?")) fire("Demo reset", () => void actions.reset()); }}>Reset demo</Button>
          </div>
        </div>

        <div aria-live="polite" className="h-10 pt-3">
          {flash && <Tag tone="lime" className="animate-rise">✓ {flash}</Tag>}
        </div>

        {/* Scripted scenario */}
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-[1fr_auto]">
            <div className="bg-brand p-6 md:p-8">
              <Tag tone="ink">Demo script · step 3</Tag>
              <h2 className="mt-4 display-lg">Sold out of trust</h2>
              <p className="mt-3 max-w-2xl">
                {demoCar.year} {demoCar.make} {demoCar.model} ({demoCar.plate}) at {demoDealer.name}: listed <b>sold</b>, loan open, ~180 km away, owner change pending.
              </p>
              <p className="mt-2 tag-text">VIN {demoCar.vin}</p>
            </div>
            <div className="flex flex-col justify-center gap-3 border-t border-ink p-6 md:border-t-0 md:border-l md:p-8">
              <Button variant="primary" arrow disabled={hydrated && scenarioFired} onClick={() => fire("Marketplace: listed as sold", () => actions.marketplaceSold(s.demo.soldCarVin))}>
                {hydrated && scenarioFired ? "Scenario fired" : "Fire: listed as sold"}
              </Button>
              <ButtonLink href="/bank" variant="secondary" arrow>Watch it on the bank</ButtonLink>
            </div>
          </div>
        </Card>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0 space-y-6">
            {/* Check-ins */}
            <section>
              <h2 className="mb-3 display-md">Random check-ins and spot checks</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {s.dealers.map((d) => {
                  const st = portfolioStats(s, d.id);
                  const open = s.checkIns.filter((c) => c.dealerId === d.id && c.status !== "completed").length;
                  const visit = s.spotChecks.find((v) => v.dealerId === d.id && v.verifier.status !== "reported");
                  return (
                    <Card key={d.id} className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{d.name}</p>
                          <p className="tag-text text-ash-700">{d.city} · {st.cars.length} cars</p>
                        </div>
                        {hydrated && <TierBadge tier={d.tier} />}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="tag-text text-ash-700">{(hydrated && [open ? `${open} check-in${open > 1 ? "s" : ""}` : "", visit ? "visit open" : ""].filter(Boolean).join(" · ")) || " "}</span>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="secondary" className="py-1.5" onClick={() => fire(`Check-in sent to ${d.name}`, () => actions.sendCheckIn(d.id))}>
                            Send check-in
                          </Button>
                          <Button variant="secondary" className="py-1.5" disabled={hydrated && !!visit} onClick={() => fire(`Spot check posted for ${d.name}`, () => actions.sendSpotCheck(d.id))}>
                            Spot check
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Feeds */}
            <section>
              <h2 className="mb-3 display-md">Signal feeds</h2>
              <div className="space-y-3">
                <FeedRow
                  source="Marketplace" tone="brand" title="Listing changes to sold / removed"
                  cars={inStock} vin={marketVin} onVin={setMarketVin}
                  buttons={[
                    { label: "Listed as sold", run: () => fire("Marketplace: sold", () => actions.marketplaceSold(marketVin, "sold")) },
                    { label: "Listing removed", run: () => fire("Marketplace: removed", () => actions.marketplaceSold(marketVin, "removed")) },
                  ]}
                />
                <FeedRow
                  source="Registry" tone="high" title="Owner change on a financed car (high severity)"
                  cars={inStock} vin={registryVin} onVin={setRegistryVin}
                  buttons={[{ label: "Owner change", run: () => fire("Registry: owner change", () => actions.registryOwnerChange(registryVin)) }]}
                />
                <FeedRow
                  source="Connected car" tone="lime" title="Telemetry from consenting dealers"
                  cars={connected} vin={geoVin} onVin={setGeoVin}
                  buttons={[
                    { label: "Leaves geofence > 48 h", run: () => fire("Connected car: left geofence", () => actions.connectedLeavesGeofence(geoVin)) },
                    { label: "Odometer +742 km", run: () => fire("Connected car: odometer jump", () => actions.connectedOdometerJump(geoVin)) },
                  ]}
                />
              </div>
            </section>

            {/* Flags */}
            <section>
              <h2 className="mb-3 display-md">Stage helpers</h2>
              <Card className="divide-y divide-ash-100">
                <Toggle
                  label="Simulate on-site location"
                  help="GPS fallback, labelled “simulated”"
                  checked={hydrated && s.flags.simulateOnSite}
                  onChange={(v) => actions.setFlag("simulateOnSite", v)}
                />
                <Toggle
                  label="Run the schedule"
                  help="Random check-ins and spot checks at each tier's rate. 1 year ≈ 10 min"
                  checked={hydrated && s.flags.autoSchedule}
                  onChange={(v) => actions.setFlag("autoSchedule", v)}
                />
                <Toggle
                  label="Auto-complete spot checks"
                  help="Reports back after ~6 s"
                  checked={hydrated && s.flags.autoVerifier}
                  onChange={(v) => actions.setFlag("autoVerifier", v)}
                />
                <Toggle
                  label="Demo camera fallback"
                  help="When a device has no camera, labelled “simulated”"
                  checked={hydrated && s.flags.demoCamera}
                  onChange={(v) => actions.setFlag("demoCamera", v)}
                />
                <Toggle
                  label="Next photo can't be read"
                  help="One time"
                  checked={hydrated && s.flags.nextPhotoUnreadable}
                  onChange={(v) => actions.setFlag("nextPhotoUnreadable", v)}
                />
              </Card>
            </section>
          </div>

          {/* Event log */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <h2 className="mb-3 display-md">Event log</h2>
            <Card className="max-h-[70vh] overflow-auto">
              <ol className="divide-y divide-ash-100">
                {hydrated && s.events.map((e) => (
                  <li key={e.id} className="flex gap-3 px-4 py-2.5 text-sm animate-rise">
                    <span className="shrink-0 tag-text pt-0.5 text-ash-500">{timeFi(e.at)}</span>
                    <span>{e.text}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}

function FeedRow({ source, tone, title, cars, vin, onVin, buttons }: {
  source: string; tone: "brand" | "high" | "lime"; title: string; cars: Car[]; vin: string; onVin: (v: string) => void;
  buttons: { label: string; run: () => void }[];
}) {
  const s = useDemo();
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={tone}>{source}</Tag>
        <span className="text-sm text-ash-700">{title}</span>
      </div>
      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
        <label className="sr-only" htmlFor={`vin-${source}`}>Car</label>
        <select
          id={`vin-${source}`}
          value={vin}
          onChange={(e) => onVin(e.target.value)}
          className="w-full min-w-0 flex-1 border border-ink bg-paper px-2 py-2 font-mono text-xs"
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
    </Card>
  );
}

function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 p-4">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-ash-700">{help}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden className="relative mt-1 h-6 w-11 shrink-0 border border-ink bg-paper transition-colors peer-checked:bg-lime peer-focus-visible:outline-2 peer-focus-visible:outline-brand-deep after:absolute after:top-0.5 after:left-0.5 after:size-[18px] after:bg-ink after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}
