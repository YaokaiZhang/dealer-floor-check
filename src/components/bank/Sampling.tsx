"use client";
import { useState } from "react";
import type { SamplingExplanation } from "@/lib/types";
import { detectionProbability } from "@/lib/sampling";
import { pct } from "@/lib/format";
import { Explainer, useWidth } from "./shared";

const fmtP = (p: number) => `${+(p * 100).toFixed(1)}%`;

export function SamplingFlow({ e }: { e: SamplingExplanation }) {
  const M = e.missingToDetect;
  const pMissAll = e.pool ? 1 - detectionProbability(e.pool, M, e.n) : 0;
  const steps = [
    { k: "Fleet", v: e.fleet, sub: "financed cars", cls: "bg-paper" },
    { k: "Auto-verified", v: e.autoVerified, sub: "by connected cars", cls: "bg-lime" },
    { k: "Pool", v: e.pool, sub: "left to sample", cls: "bg-paper" },
    { k: "Check", v: e.n, sub: "random VINs", cls: "bg-brand" },
  ];
  return (
    <div>
      <ol className="grid grid-cols-2 border border-ink sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.k} className={`relative p-3 ${s.cls} ${i % 2 ? "border-l border-ink" : ""} ${i >= 2 ? "border-t border-ink sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
            <p className="tag-text">{s.k}</p>
            <p className="mt-1 figure text-5xl">{s.v}</p>
            <p className="mt-1 text-xs">{s.sub}</p>
            {i < 3 && <span className="absolute top-2 -right-3 z-10 hidden size-6 items-center justify-center border border-ink bg-paper text-xs sm:flex" aria-hidden>→</span>}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-lg leading-snug"><strong>{pct(e.confidence)}</strong> confidence ≤{fmtP(e.p)} missing</p>
        <Explainer label="How is n chosen?">
          <span className="block font-semibold">Hypergeometric sampling</span>
          <span className="mt-2 block">
            Suppose M = ⌈p·N⌉ = <b>{M}</b> of the N = <b>{e.pool}</b> pool cars were missing. Drawing n cars at random without replacement, the chance that we miss all of them is
          </span>
          <span className="my-2 block border border-ink bg-mist p-2 text-center font-mono text-xs">
            P(miss all) = C(N−M, n) / C(N, n)
          </span>
          <span className="block">
            We pick the smallest n where that is ≤ {pct(1 - e.confidence)}. Here n = <b>{e.n}</b> gives P(miss all) = <b>{pct(pMissAll, 1)}</b>, so detection ≥ {pct(1 - pMissAll, 1)}.
          </span>
          <span className="mt-2 block text-ash-700">Cars already verified by connected-car data leave the pool, so every connected car makes the check-in smaller.</span>
        </Explainer>
      </div>
      {e.pool > 0 && <DetectionCurve N={e.pool} M={M} n={e.n} confidence={e.confidence} />}
    </div>
  );
}

/** P(detect ≥1 missing car) vs sample size n. Single series, so no legend: the title names it. */
function DetectionCurve({ N, M, n, confidence }: { N: number; M: number; n: number; confidence: number }) {
  const [ref, w] = useWidth<HTMLDivElement>(560);
  const [hover, setHover] = useState<number | null>(null);
  const H = 180, L = 40, R = 12, T = 12, B = 30;
  const iw = Math.max(100, w - L - R), ih = H - T - B;
  const pts = Array.from({ length: N + 1 }, (_, k) => ({ k, p: detectionProbability(N, M, k) }));
  const x = (k: number) => L + (k / N) * iw;
  const y = (p: number) => T + (1 - p) * ih;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.k).toFixed(1)},${y(p.p).toFixed(1)}`).join("");
  const sel = hover ?? n;
  const selP = detectionProbability(N, M, sel);
  const ticks = Array.from(new Set([0, Math.round(N / 4), Math.round(N / 2), Math.round((3 * N) / 4), N]));

  return (
    <figure className="mt-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="tag-text">Chance of catching ≥1 missing car, by cars checked</span>
        <span className="text-sm tabular-nums">
          n = <b>{sel}</b> → <b>{pct(selP, 1)}</b>
        </span>
      </figcaption>
      <div ref={ref} className="mt-2">
        <svg
          width={w}
          height={H}
          className="block touch-none"
          onPointerMove={(ev) => {
            const r = (ev.currentTarget as SVGSVGElement).getBoundingClientRect();
            const k = Math.round(((ev.clientX - r.left - L) / iw) * N);
            setHover(Math.max(0, Math.min(N, k)));
          }}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Detection probability rises from 0 to 100% as more of the ${N} pool cars are checked; ${n} cars reach ${pct(confidence)}.`}
        >
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={L} x2={L + iw} y1={y(g)} y2={y(g)} stroke="#ececec" />
              <text x={L - 6} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#4d4d4d" className="tabular-nums">{g * 100}%</text>
            </g>
          ))}
          <line x1={L} x2={L + iw} y1={y(confidence)} y2={y(confidence)} stroke="#000" strokeWidth="1" />
          <text x={L + iw} y={y(confidence) - 4} textAnchor="end" fontSize="10" fill="#000">target {pct(confidence)}</text>
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize="10" fill="#4d4d4d" className="tabular-nums">{t}</text>
          ))}
          <text x={L} y={H - 0} fontSize="9" fill="#8a8a8a">cars checked (n)</text>
          <path d={`${path}L${x(N)},${y(0)}L${x(0)},${y(0)}Z`} fill="#5b4fe0" opacity="0.1" />
          <path d={path} fill="none" stroke="#5b4fe0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <line x1={x(sel)} x2={x(sel)} y1={T} y2={T + ih} stroke="#8a8a8a" strokeWidth="1" />
          <circle cx={x(n)} cy={y(detectionProbability(N, M, n))} r="5" fill="#5b4fe0" stroke="#fff" strokeWidth="2" />
          {hover !== null && hover !== n && <circle cx={x(sel)} cy={y(selP)} r="4" fill="#000" stroke="#fff" strokeWidth="2" />}
        </svg>
      </div>
    </figure>
  );
}
