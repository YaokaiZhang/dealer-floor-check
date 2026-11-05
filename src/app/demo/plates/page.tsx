"use client";
import { useState } from "react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SectionTag } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
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
      <main className="mx-auto max-w-[1400px] px-4 pt-8 pb-16 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <SectionTag>Stage prop</SectionTag>
            <h1 className="mt-2 display-xl">VIN plates</h1>
            <p className="mt-2 max-w-xl text-ash-700">Photograph these from the dealer phone during a check-in, or print the page. Cars drawn in the active check-in come first.</p>
          </div>
          <select value={dealerId} onChange={(e) => setDealerId(e.target.value)} className="border border-ink bg-paper px-3 py-2">
            {s.dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {hydrated && drawn.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 flex items-center gap-2 display-md">In the active check-in <Tag tone="lime">{drawn.length}</Tag></h2>
            <Grid cars={drawn} />
          </>
        )}
        <h2 className="mt-8 mb-3 display-md">All cars in stock</h2>
        <Grid cars={rest} />
      </main>
    </>
  );
}

function Grid({ cars }: { cars: Car[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((c) => <Plate key={c.vin} car={c} />)}
    </div>
  );
}

/** A door-pillar style VIN sticker. */
function Plate({ car }: { car: Car }) {
  // Deterministic pseudo-barcode from the VIN characters.
  const bars = [...car.vin].flatMap((ch, i) => { const k = ch.charCodeAt(0) + i; return [1 + (k % 3), 1 + ((k >> 2) % 2)]; });
  let x = 0;
  return (
    <figure className="break-inside-avoid border border-ink bg-[#f2f0ea] p-4 shadow-card">
      <div className="flex items-center justify-between border-b border-ink pb-2 font-mono text-[10px] uppercase tracking-wider">
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
