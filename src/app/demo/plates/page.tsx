"use client";
import { useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useDemo, useHydrated } from "@/lib/store";
import type { Car } from "@/lib/types";

/**
 * Rendered VIN labels for the stage demo: photograph them from this screen (or print the page)
 * during a dealer check-in. Cars drawn in an active check-in are shown first.
 */
export default function PlatesPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const [dealerId, setDealerId] = useState("d1");
  const active = s.checkIns.find((c) => c.dealerId === dealerId && c.status === "in_progress");
  const drawn = active ? active.sampledVins.map((v) => s.cars.find((c) => c.vin === v)!) : [];
  const rest = s.cars.filter((c) => c.dealerId === dealerId && c.status === "in_stock" && !drawn.includes(c));

  return (
    <>
      <div className="print:hidden"><RoleSwitcher /></div>
      <main className="overflow-x-clip">
        <header className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 pt-10 pb-8 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:pt-14 lg:pb-10 print:hidden">
          <h1 className="display-wide text-[clamp(2.5rem,7vw,6.5rem)]">VIN<br />plates</h1>
          <div>
            <label htmlFor="plates-dealer" className="sr-only">Dealer</label>
            <select id="plates-dealer" value={dealerId} onChange={(e) => setDealerId(e.target.value)} className="w-full border border-ink bg-paper px-3 py-2.5 text-sm sm:w-auto">
              {s.dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </header>
        {hydrated && drawn.length > 0 && (
          <Section title="In the check-in" count={drawn.length} cars={drawn} />
        )}
        <Section title="In stock" count={rest.length} cars={rest} />
      </main>
    </>
  );
}

function Section({ title, count, cars }: { title: string; count: number; cars: Car[] }) {
  return (
    <section className="border-t border-ink print:border-t-0">
      <div className="mx-auto max-w-[1600px] px-4 pt-8 pb-12 md:px-8 md:pt-10">
        <h2 className="mb-6 flex items-baseline gap-3 display-lg">{title} <span className="figure text-base text-ash-700">{count}</span></h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
          {cars.map((c) => <Plate key={c.vin} car={c} />)}
        </div>
      </div>
    </section>
  );
}

/** A door-pillar style VIN sticker. */
function Plate({ car }: { car: Car }) {
  // Deterministic pseudo-barcode from the VIN characters.
  const bars = [...car.vin].flatMap((ch, i) => { const k = ch.charCodeAt(0) + i; return [1 + (k % 3), 1 + ((k >> 2) % 2)]; });
  let x = 0;
  return (
    <figure className="break-inside-avoid border border-line bg-[#f2f0ea] p-4">
      <div className="flex items-center justify-between border-b border-line pb-2 font-mono text-[10px] uppercase tracking-wider">
        <span>{car.make} · Made {car.year}</span>
        <span>GVW 2 150 kg</span>
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ash-700">Vehicle identification no.</p>
      <p className="font-mono text-[1.45rem] font-medium tracking-[0.12em] tabular-nums">{car.vin}</p>
      <svg viewBox="0 0 200 34" className="mt-2 h-9 w-full" preserveAspectRatio="none" aria-hidden>
        {bars.map((w, i) => { const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w * 1.6} height={34} fill="#111" /> : null; x += w * 1.6 + 1.2; return r; })}
      </svg>
      <figcaption className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-ash-700">
        <span>{car.model} · {car.color}</span>
        <span>{car.plate}</span>
      </figcaption>
    </figure>
  );
}
