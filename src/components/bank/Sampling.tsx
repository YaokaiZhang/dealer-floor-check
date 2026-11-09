"use client";
import { useState } from "react";
import type { SamplingExplanation } from "@/lib/types";
import { detectionProbability, yearlyDetection } from "@/lib/sampling";
import { pct } from "@/lib/format";
import { Explainer, useWidth } from "./shared";

const fmtP = (p: number) => `${+(p * 100).toFixed(1)}%`;

export function SamplingFlow({ e }: { e: SamplingExplanation }) {
  const M = e.missingToDetect;
  const steps = [
    { k: "Fleet", v: e.fleet, sub: "financed cars", cls: "bg-paper" },
    { k: "In stock", v: e.pool, sub: "ranked by car risk", cls: "bg-lime" },
    { k: "Missing", v: e.missingToDetect, sub: `to catch (${Math.round(e.p * 100)}%)`, cls: "bg-paper" },
    { k: "Check", v: e.n, sub: `cars drawn · ${e.perYear}×/yr`, cls: "bg-brand" },
  ];
  return (
    <div>
      <ol className="grid grid-cols-2 border border-ink sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.k} className={`relative p-3 ${i > 0 ? "sm:pl-6" : ""} ${s.cls} ${i % 2 ? "border-l border-ink" : ""} ${i >= 2 ? "border-t border-ink sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
            <p className="tag-text">{s.k}</p>
            <p className="mt-2 figure text-5xl">{s.v}</p>
            <p className="mt-1 text-xs">{s.sub}</p>
            {i < 3 && <span className="absolute top-2 -right-3 z-10 hidden size-6 items-center justify-center border border-ink bg-paper text-xs sm:flex" aria-hidden>→</span>}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-lg leading-snug tabular-nums">
          <strong>{pct(e.yearly, 1)}</strong> within a year · ~{e.expectedDays} days on average
        </p>
        <Explainer label="How is n chosen?">
          <span className="block font-semibold">Small samples, repeated</span>
          <span className="mt-2 block">
            Suppose M = ⌈p·N⌉ = <b>{M}</b> of the N = <b>{e.pool}</b> pool cars ({fmtP(e.p)}) were missing. One check-in of n random cars misses all of them with
          </span>
          <span className="my-2 block border border-line bg-mist p-2 text-center font-mono text-xs">
            q = C(N−M, n) / C(N, n)
          </span>
          <span className="block">
            Each of the <b>{e.perYear}</b> check-ins a year draws afresh, so all of them miss with q<sup>{e.perYear}</sup>.
          </span>
          <span className="mt-2 block">
            Random spot checks add their own chance: <b>{e.visitsPerYear}</b> unannounced visits of {e.visitCars} cars from all stock, drawn the same way, each catching it {pct(e.perVisit, 1)} of the time. A year misses with q<sup>{e.perYear}</sup> · q<sub>visit</sub><sup>{e.visitsPerYear}</sup>.
          </span>
          <span className="mt-2 block">
            We pick the smallest n where the year reaches {pct(e.confidence)}, capped at {e.maxCars} cars.
          </span>
          <span className="mt-2 block">
            Here n = <b>{e.n}</b>: one check-in catches it {pct(e.perCheckIn, 1)} of the time; check-ins and visits together {pct(e.yearly, 1)} a year.
          </span>
        </Explainer>
      </div>
      {e.pool > 0 && <DetectionCurve N={e.pool} M={M} n={e.n} k={e.perYear} visitMiss={(1 - e.perVisit) ** e.visitsPerYear} visits={e.visitsPerYear} confidence={e.confidence} />}
    </div>
  );
}

/** P(catch ≥1 missing car) vs cars per check-in: one check-in (dashed) and a year of them (solid), labelled at the line ends. */
function DetectionCurve({ N, M, n, k, visitMiss, visits, confidence }: { N: number; M: number; n: number; k: number; visitMiss: number; visits: number; confidence: number }) {
  const [ref, w] = useWidth<HTMLDivElement>(560);
  const [hover, setHover] = useState<number | null>(null);
  const X = Math.min(N, Math.max(12, n * 2));
  const H = 190, L = 40, R = 76, T = 12, B = 40;
  const iw = Math.max(100, w - L - R), ih = H - T - B;
  const once = (c: number) => detectionProbability(N, M, c);
  const year = (c: number) => 1 - (1 - yearlyDetection(N, M, c, k)) * visitMiss;
  const x = (c: number) => L + (c / X) * iw;
  const y = (p: number) => T + (1 - p) * ih;
  const line = (f: (c: number) => number) => Array.from({ length: X + 1 }, (_, c) => `${c ? "L" : "M"}${x(c).toFixed(1)},${y(f(c)).toFixed(1)}`).join("");
  const sel = hover ?? n;
  const ticks = Array.from(new Set([0, Math.round(X / 4), Math.round(X / 2), Math.round((3 * X) / 4), X]));

  return (
    <figure className="mt-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Chance of catching a missing car</span>
        <span className="text-sm tabular-nums">
          n = <b>{sel}</b> → <b>{pct(once(sel), 1)}</b> once · <b>{pct(year(sel), 1)}</b> a year
        </span>
      </figcaption>
      <div ref={ref} className="mt-2">
        <svg
          width={w}
          height={H}
          className="block touch-none"
          onPointerMove={(ev) => {
            const r = (ev.currentTarget as SVGSVGElement).getBoundingClientRect();
            const c = Math.round(((ev.clientX - r.left - L) / iw) * X);
            setHover(Math.max(0, Math.min(X, c)));
          }}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`With ${n} cars per check-in, one check-in catches a missing car ${pct(once(n))} of the time; ${k} check-ins and ${visits} spot checks a year ${pct(year(n))}.`}
        >
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={L} x2={L + iw} y1={y(g)} y2={y(g)} stroke="#e6eaf0" />
              <text x={L - 6} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#3d4858" className="tabular-nums">{g * 100}%</text>
            </g>
          ))}
          <line x1={L} x2={L + iw} y1={y(confidence)} y2={y(confidence)} stroke="#0f1e33" strokeWidth="1" strokeDasharray="2 3" />
          <text x={L + iw - 4} y={y(confidence) + 13} textAnchor="end" fontSize="10" fill="#0f1e33" paintOrder="stroke" stroke="#fff" strokeWidth="3">target {pct(confidence)} a year</text>
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 24} textAnchor="middle" fontSize="11" fill="#3d4858" className="tabular-nums">{t}</text>
          ))}
          <text x={L + iw / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#3d4858">cars per check-in (n)</text>
          <path d={line(once)} fill="none" stroke="#5f6b7a" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d={line(year)} fill="none" stroke="#1f4f9e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <text x={L + iw + 6} y={y(year(X)) + 4} fontSize="11" fill="#1f4f9e" fontWeight="600">{k}×/yr</text>
          <text x={L + iw + 6} y={y(year(X)) + 17} fontSize="10" fill="#1f4f9e">+{visits} visits</text>
          <text x={L + iw + 6} y={Math.max(y(once(X)) + 4, y(year(X)) + 32)} fontSize="11" fill="#3d4858">once</text>
          <line x1={x(sel)} x2={x(sel)} y1={T} y2={T + ih} stroke="#5f6b7a" strokeWidth="1" />
          <circle cx={x(n)} cy={y(year(n))} r="5" fill="#1f4f9e" stroke="#fff" strokeWidth="2" />
          {hover !== null && hover !== n && <circle cx={x(sel)} cy={y(year(sel))} r="4" fill="#0f1e33" stroke="#fff" strokeWidth="2" />}
        </svg>
      </div>
    </figure>
  );
}
