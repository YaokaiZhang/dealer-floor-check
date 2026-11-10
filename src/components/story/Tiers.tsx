"use client";
import { useEffect, useRef, useState } from "react";
import { CLEAN_STREAK_TO_STEP_UP, physicalPlan, TIERS, TIER_ORDER } from "@/config/tiers";
import { ASSUMPTIONS } from "@/config/assumptions";
import type { Tier } from "@/lib/types";
import { ease, span } from "./Scene";

/**
 * Chapter 6: a dealer climbs the tier staircase. Three clean check-ins tick
 * in, the dealer steps up, and the year strip above empties out: fewer
 * check-ins and spot checks as trust grows. Starts at Standard, ends at Gold.
 */

const SANS = { fontFamily: "var(--font-sans)" } as const;
const INK = "var(--color-ink)";
const FILL: Record<string, string> = {
  Review: "var(--color-mist)",
  Standard: "var(--color-brand)",
  Silver: "var(--color-silver)",
  Gold: "var(--color-gold)",
};
/** Weight of a tier at a continuous level (1 at its level, fading to neighbours). */
const weight = (level: number, i: number) => Math.max(0, 1 - Math.abs(level - i));
/** Spot checks a year for a dealer with average stock (they scale with stock now). */
const spots = (t: Tier) => physicalPlan(t, ASSUMPTIONS.carsPerFullCount).visits;
const START = TIER_ORDER.indexOf("Standard");
const END = TIER_ORDER.indexOf("Gold");

/** Twelve month slots; n events a year sit evenly in them (12, 6, 4 and 2 nest, so dots drop out rather than move). */
const has = (n: number, k: number) => k % (12 / n) === 0;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** For each slot: how solid the event is at this level, and how much of a ghost it leaves once dropped. */
function slots(level: number, per: (i: number) => number) {
  return Array.from({ length: 12 }, (_, k) => {
    let now = 0, ever = 0;
    TIER_ORDER.forEach((_, i) => {
      if (i < START) return;
      if (has(per(i), k)) {
        now += weight(level, i);
        ever = Math.max(ever, i === START ? 1 : clamp01(level - (i - 1)));
      }
    });
    return { now, ghost: clamp01(ever - now) };
  });
}

const ROWS: { label: string; values: string[] }[] = [
  { label: "Check-ins a year", values: TIER_ORDER.map((t) => String(TIERS[t].checkInsPerYear)) },
  { label: "Spot checks a year", values: TIER_ORDER.map((t) => String(spots(t))) },
  { label: "Line review answer, business days", values: TIER_ORDER.map((t) => TIERS[t].lineReview?.split(" ")[0] ?? "—") },
  { label: "Rate, pp", values: TIER_ORDER.map((t) => (TIERS[t].rateDiscountPp ? `−${TIERS[t].rateDiscountPp.toFixed(2)}` : "0")) },
];

type Layout = {
  vw: number; vh: number; m: number;
  /** Year strip */
  gutter: number; labelY: number; dotY: number; axisY: number; spotY: number; dotR: number; big: number;
  /** Stairs */
  baseY: number; rise: number; name: number;
  /** Table */
  tableY: number; rowH: number; val: number; small: number;
  marker: number;
};

const WIDE: Layout = { vw: 800, vh: 640, m: 8, gutter: 120, labelY: 16, dotY: 58, axisY: 84, spotY: 112, dotR: 9, big: 46, baseY: 432, rise: 62, name: 15, tableY: 456, rowH: 45, val: 17, small: 12, marker: 22 };
const NARROW: Layout = { vw: 360, vh: 480, m: 4, gutter: 76, labelY: 12, dotY: 42, axisY: 62, spotY: 84, dotR: 7, big: 32, baseY: 320, rise: 45, name: 11, tableY: 334, rowH: 36, val: 14, small: 10, marker: 18 };

function useNarrow() {
  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 560));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, narrow };
}

/** Climbs: Standard to Silver, then Silver to Gold (done by p ≈ 0.85). */
const CLIMBS = [
  { ticks: [0.12, 0.2, 0.28], climb: [0.32, 0.44] as const },
  { ticks: [0.52, 0.6, 0.68], climb: [0.72, 0.85] as const },
];


export function Tiers({ p }: { p: number }) {
  const { ref, narrow } = useNarrow();
  const L = narrow ? NARROW : WIDE;
  const cw = (L.vw - 2 * L.m) / 4;

  // Continuous level and the hop in progress.
  const c = CLIMBS.map((s) => span(p, s.climb[0], s.climb[1]));
  const level = START + ease(c[0]) + ease(c[1]);
  const active = c[0] < 1 ? 0 : 1;
  const hop = c[active];
  const from = START + active;
  const streak = level >= END ? null : CLIMBS[active].ticks.map((t) => span(p, t, t + 0.035));
  const boxes = streak ? (hop > 0 ? 1 - span(hop, 0, 0.3) : c[0] >= 1 && active === 1 ? span(p, CLIMBS[0].climb[1], CLIMBS[0].climb[1] + 0.03) : 1) : 0;

  const top = (i: number) => L.baseY - (i + 1) * L.rise;
  const colX = (i: number) => L.m + i * cw;
  // Marker sits near the left of the step top, ticks to its right.
  const mx0 = colX(from) + 10, mx1 = colX(Math.min(END, from + 1)) + 10;
  const he = ease(hop);
  const mx = mx0 + (mx1 - mx0) * he;
  const my = top(from) + (top(Math.min(END, from + 1)) - top(from)) * he - Math.sin(Math.PI * hop) * L.rise * 0.9;

  // Year strip
  const x0 = L.gutter, x1 = L.vw - L.m - L.dotR;
  const sx = (k: number) => x0 - L.dotR + ((x1 - x0 + 2 * L.dotR) * (k + 0.5)) / 12;
  const count = (key: "c" | "s") => TIER_ORDER.map((t, i) => ({ v: key === "c" ? TIERS[t].checkInsPerYear : spots(t), w: weight(level, i) })).filter((d) => d.w > 0);
  const tierAt = Math.round(level);

  return (
    <div ref={ref} className="relative h-full w-full" role="img" aria-label="Four tiers as a staircase: Review, Standard, Silver, Gold. A dealer starts at Standard and, after three clean check-ins at each step, climbs to Silver and then Gold. Check-ins a year drop from 6 to 4 to 2 and spot checks from 3 to 2 to 1; Gold also answers credit line reviews in 1 business day and takes 0.25 percentage points off the rate.">
      <svg aria-hidden viewBox={`0 0 ${L.vw} ${L.vh}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" style={SANS}>
        {/* Year strip: the memorable part, emptying out as trust grows */}
        <text x={L.m} y={L.labelY} fontSize={L.small} fill="var(--color-ash-700)">Laakso Autot, check-ins in a year</text>
        <g>
          {count("c").map((d) => (
            <text key={d.v} x={L.m} y={L.dotY + L.big * 0.36} fontSize={L.big} fill={INK} opacity={d.w} className="figure">{d.v}</text>
          ))}
        </g>
        <line x1={x0 - L.dotR} x2={x1 + L.dotR} y1={L.axisY} y2={L.axisY} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
        {Array.from({ length: 13 }, (_, k) => (
          <line key={k} x1={x0 - L.dotR + ((x1 - x0 + 2 * L.dotR) * k) / 12} x2={x0 - L.dotR + ((x1 - x0 + 2 * L.dotR) * k) / 12} y1={L.axisY - 3} y2={L.axisY + 3} stroke="var(--color-ash-300)" vectorEffect="non-scaling-stroke" />
        ))}
        {slots(level, (i) => TIERS[TIER_ORDER[i]].checkInsPerYear).map((d, k) => (
          <g key={`c${k}`}>
            {d.ghost > 0 && <circle cx={sx(k)} cy={L.dotY} r={L.dotR - 1} fill="none" stroke="var(--color-ash-300)" strokeOpacity={d.ghost} vectorEffect="non-scaling-stroke" />}
            {d.now > 0 && <circle cx={sx(k)} cy={L.dotY} r={L.dotR * (0.4 + 0.6 * d.now)} fill={INK} opacity={d.now} />}
          </g>
        ))}
        <text x={L.m} y={L.spotY + 4} fontSize={L.small} fill="var(--color-ash-700)">
          {count("s").map((d) => <tspan key={d.v} className="figure" opacity={d.w}>{d.w >= 0.5 ? d.v : ""}</tspan>)} spot check{spots(TIER_ORDER[tierAt]) === 1 ? "" : "s"}
        </text>
        {slots(level, (i) => spots(TIER_ORDER[i])).map((d, k) => {
          const q = L.dotR * 1.1;
          return (
            <g key={`s${k}`} transform={`translate(${sx(k) - q / 2} ${L.spotY - q / 2})`}>
              {d.ghost > 0 && <rect width={q} height={q} fill="none" stroke="var(--color-ash-300)" strokeOpacity={d.ghost} vectorEffect="non-scaling-stroke" />}
              {d.now > 0 && <rect x={(q * (1 - d.now)) / 2} y={(q * (1 - d.now)) / 2} width={q * d.now} height={q * d.now} fill="var(--color-brand-deep)" />}
            </g>
          );
        })}
        <text x={x0 - L.dotR} y={L.axisY + L.small + 4} fontSize={L.small - 1} fill="var(--color-ash-500)">Jan</text>
        <text x={x1 + L.dotR} y={L.axisY + L.small + 4} fontSize={L.small - 1} fill="var(--color-ash-500)" textAnchor="end">Dec</text>

        {/* Table band follows the dealer */}
        <rect x={colX(level)} y={L.tableY} width={cw} height={L.vh - L.tableY} fill="var(--color-brand-soft)" />

        {/* Staircase */}
        {TIER_ORDER.map((t, i) => (
          <g key={t}>
            <rect x={colX(i)} y={top(i)} width={cw} height={L.baseY - top(i)} fill={FILL[t]} stroke={INK} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={colX(i) + 10} y={top(i) + L.name + 10} fontSize={L.name} fill={INK} className="display-wide">{t}</text>
            {t === "Standard" && <text x={colX(i) + 10} y={L.baseY - 10} fontSize={L.small - 1} fill="var(--color-ash-700)">Start</text>}
          </g>
        ))}
        <line x1={0} x2={L.vw} y1={L.baseY} y2={L.baseY} stroke={INK} vectorEffect="non-scaling-stroke" />

        {/* Clean streak: three ticks, then the step up */}
        {streak && boxes > 0 && (
          <g opacity={boxes} transform={`translate(${colX(from) + 10 + L.marker + 8} ${top(from) - L.marker * 0.62 - 6})`}>
            {streak.map((s, k) => {
              const b = L.marker * 0.62;
              const e = ease(s);
              return (
                <g key={k} transform={`translate(${k * (b + 4)} 0)`}>
                  <rect width={b} height={b} fill="var(--color-paper)" stroke="var(--color-ash-300)" vectorEffect="non-scaling-stroke" />
                  {s > 0 && <rect width={b} height={b} fill="var(--color-lime)" opacity={e} />}
                  {s > 0 && <path d={`M${b * 0.22} ${b * 0.52} L${b * 0.42} ${b * 0.72} L${b * 0.8} ${b * 0.28}`} fill="none" stroke="var(--color-go)" strokeWidth={1.8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - e} />}
                </g>
              );
            })}
            {!narrow && <text x={CLEAN_STREAK_TO_STEP_UP * (L.marker * 0.62 + 4) + 4} y={L.marker * 0.62 - 3} fontSize={L.small - 1} fill="var(--color-ash-700)">clean</text>}
          </g>
        )}

        {/* The dealer */}
        <g transform={`translate(${mx} ${my - L.marker - 6})`}>
          <text y={-6} fontSize={L.small} fill={INK} fontWeight={500}>Laakso Autot</text>
          <rect width={L.marker} height={L.marker} fill={INK} />
          <path d={`M${L.marker * 0.2} ${L.marker * 0.42} H${L.marker * 0.8} M${L.marker * 0.3} ${L.marker * 0.42} V${L.marker * 0.8} H${L.marker * 0.7} V${L.marker * 0.42}`} fill="none" stroke="var(--color-paper)" strokeWidth={1.5} />
          <rect x={L.marker * 0.15} y={L.marker * 0.2} width={L.marker * 0.7} height={L.marker * 0.18} fill="var(--color-lime)" />
        </g>

        {/* Perks per tier; the current column is shaded */}
        {ROWS.map((r, j) => {
          const y = L.tableY + j * L.rowH;
          return (
            <g key={r.label}>
              <line x1={L.m} x2={L.vw - L.m} y1={y} y2={y} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
              <text x={L.m + 2} y={y + L.small + 4} fontSize={L.small - 1} fill="var(--color-ash-500)">{r.label}</text>
              {r.values.map((v, i) => {
                const near = Math.abs(level - i) < 0.5;
                return (
                  <text key={i} x={colX(i) + 10} y={y + L.small + 6 + L.val} fontSize={L.val} fill={near ? INK : "var(--color-ash-500)"} className="figure">{v}</text>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
