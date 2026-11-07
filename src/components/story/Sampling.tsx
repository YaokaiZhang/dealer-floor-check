"use client";
import { useId } from "react";
import { ease, span } from "./Scene";

/**
 * A year of check-ins against the cars data couldn't verify. Each check-in
 * draws three cars at random; they light up and turn verified. Three of the 24
 * are secretly missing and look like the rest until one is drawn (check-in 4).
 * Below, the chance of finding a missing car climbs check-in by check-in.
 *
 * Maths: N = 24 cars, M = 3 missing, n = 3 drawn per check-in (fresh each time).
 * One check-in misses every missing car with q = C(21,3) / C(24,3) = 1330 / 2024.
 * Found by check-in k: 1 − q^k → 34%, 57%, 72%, 81%, 88%, 92%.
 */

const N = 24, M = 3, DRAW = 3;
const choose = (a: number, b: number) => { let r = 1; for (let i = 0; i < b; i++) r = (r * (a - i)) / (i + 1); return r; };
const Q = choose(N - M, DRAW) / choose(N, DRAW);
const CHANCE = Array.from({ length: 6 }, (_, k) => 1 - Q ** (k + 1));

/** Hidden missing cars (pool indices). */
const MISSING = new Set([5, 14, 19]);
/** The draws for this year, from a seeded LCG so server and client agree. Seed chosen so the first missing car turns up at check-in 4. */
const PICKS: number[][] = (() => {
  let x = 186;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const out: number[][] = [];
  for (let k = 0; k < 6; k++) {
    const s = new Set<number>();
    while (s.size < DRAW) s.add(Math.floor(rnd() * N));
    out.push([...s]);
  }
  return out;
})();
const FOUND_AT = PICKS.findIndex((d) => d.some((i) => MISSING.has(i)));

/** Check-in dates as fractions of the year. */
const T = [0.05, 0.21, 0.37, 0.53, 0.69, 0.85];
const ACT = 0.06; // how long a draw takes to light up, in year fractions
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SANS = { fontFamily: "var(--font-sans)" };

type Layout = {
  w: number; h: number; fs: number;
  grid: { x: number; y: number; cols: number; cw: number; ch: number; car: [number, number] };
  verified: { x: number; y: number; cols: number; s: number } | null;
  chart: { x0: number; x1: number; y0: number; y1: number };
  axisY: number; short: boolean; note: string[]; noteY: number;
};

const WIDE: Layout = {
  w: 800, h: 690, fs: 1,
  grid: { x: 20, y: 46, cols: 8, cw: 70, ch: 86, car: [30, 56] },
  verified: { x: 620, y: 66, cols: 6, s: 22 },
  chart: { x0: 20, x1: 780, y0: 352, y1: 560 },
  axisY: 590, short: false,
  note: ["If 3 of the 24 are missing, one 3-car draw misses all of them 66% of the time (1330 of 2024 draws).", "After k check-ins the chance of finding one is 1 − 0.66ᵏ."],
  noteY: 650,
};
const TALL: Layout = {
  w: 360, h: 512, fs: 1,
  grid: { x: 6, y: 36, cols: 6, cw: 58, ch: 60, car: [22, 40] },
  verified: null,
  chart: { x0: 6, x1: 354, y0: 318, y1: 436 },
  axisY: 456, short: true,
  note: ["If 3 of 24 are missing, 3 drawn per check-in: 1 − (1330/2024)ᵏ"],
  noteY: 500,
};

function carCenter(L: Layout, i: number): [number, number] {
  const { x, y, cols, cw, ch } = L.grid;
  return [x + (i % cols) * cw + cw / 2, y + Math.floor(i / cols) * ch + ch / 2];
}

function CarGlyph({ cx, cy, w, h, fill, lime, ring, red }: { cx: number; cy: number; w: number; h: number; fill: string; lime: number; ring: number; red: number }) {
  const x = cx - w / 2, y = cy - h / 2;
  return (
    <g>
      {ring > 0 && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} fill="none" stroke="var(--color-brand-deep)" strokeWidth={2} opacity={ring} />}
      <rect x={x} y={y} width={w} height={h} rx={w * 0.22} fill={fill} />
      {lime > 0 && <rect x={x} y={y} width={w} height={h} rx={w * 0.22} fill="var(--color-lime)" opacity={lime} />}
      {red > 0 && <rect x={x} y={y} width={w} height={h} rx={w * 0.22} fill="var(--color-high)" opacity={red} />}
      <rect x={x + w * 0.14} y={y + h * 0.2} width={w * 0.72} height={h * 0.17} rx={w * 0.08} fill="rgba(0,0,0,0.55)" />
      <rect x={x + w * 0.18} y={y + h * 0.72} width={w * 0.64} height={h * 0.1} rx={w * 0.06} fill="rgba(0,0,0,0.35)" />
    </g>
  );
}

function Picture({ L, t, className }: { L: Layout; t: number; className: string }) {
  const clip = useId();
  const { x0, x1, y0, y1 } = L.chart;
  const X = (f: number) => x0 + (x1 - x0) * f;
  const Y = (v: number) => y1 - (y1 - y0) * v;

  // Per-car state from the draws so far.
  const lime = new Array<number>(N).fill(0);
  const ring = new Array<number>(N).fill(0);
  const red = new Array<number>(N).fill(0);
  let chance = 0;
  PICKS.forEach((draw, k) => {
    const a = span(t, T[k], T[k] + ACT);
    if (a <= 0) return;
    const fill = ease(span(a, 0.45, 1));
    const out = 1 - span(t, T[k] + ACT + 0.02, T[k] + ACT + 0.06);
    const on = ease(span(a, 0, 0.35)) * out;
    for (const i of draw) {
      ring[i] = Math.max(ring[i], on);
      if (MISSING.has(i)) red[i] = Math.max(red[i], fill);
      else lime[i] = Math.max(lime[i], fill);
    }
    chance += (CHANCE[k] - (k ? CHANCE[k - 1] : 0)) * ease(span(a, 0.3, 0.9));
  });
  const found = red.some((r) => r > 0);
  const cursor = X(t);

  // Stepped chance line for the whole year; revealed up to the cursor.
  let d = `M${X(0)} ${Y(0)}`;
  T.forEach((f, k) => { d += `H${X(f)}V${Y(CHANCE[k])}`; });
  d += `H${X(1)}`;
  const area = `${d}V${Y(0)}H${X(0)}Z`;
  const [cw, chh] = L.grid.car;
  const fs = (n: number) => n * L.fs;

  return (
    <svg viewBox={`0 0 ${L.w} ${L.h}`} preserveAspectRatio="xMidYMid meet" className={className} aria-hidden>
      <defs>
        <clipPath id={clip}><rect x={x0 - 2} y={0} width={Math.max(0, cursor - x0 + 2)} height={L.h} /></clipPath>
      </defs>
      <g style={SANS}>
        {/* pool */}
        <text x={L.grid.x} y={L.grid.y - 18} fontSize={fs(13)} fill="var(--color-ink)" fontWeight={500}>
          <tspan className="figure">24</tspan> cars data couldn’t verify
        </text>
        {L.verified ? (
          <g opacity={0.6}>
            {Array.from({ length: 31 }, (_, i) => {
              const v = L.verified!;
              return <rect key={i} x={v.x + (i % v.cols) * v.s} y={v.y + Math.floor(i / v.cols) * v.s * 1.6} width={v.s * 0.55} height={v.s} rx={2} fill="var(--color-lime)" />;
            })}
            <text x={L.verified.x} y={L.grid.y - 18} fontSize={fs(12)} fill="var(--color-ash-500)">
              <tspan className="figure">31</tspan> verified by data
            </text>
            <text x={L.verified.x} y={L.verified.y + 6 * L.verified.s * 1.6 + 6} fontSize={fs(11)} fill="var(--color-ash-500)">not sampled</text>
          </g>
        ) : (
          <text x={L.w - 6} y={L.grid.y - 18} fontSize={fs(11)} textAnchor="end" fill="var(--color-ash-500)">
            + <tspan className="figure">31</tspan> verified by data
          </text>
        )}
        {Array.from({ length: N }, (_, i) => {
          const [cx, cy] = carCenter(L, i);
          return <CarGlyph key={i} cx={cx} cy={cy} w={cw} h={chh} fill="var(--color-ash-700)" lime={lime[i]} ring={ring[i]} red={red[i]} />;
        })}
        {found && PICKS[FOUND_AT].filter((i) => MISSING.has(i)).map((i) => {
          const [cx, cy] = carCenter(L, i);
          const o = red[i];
          return (
            <g key={i} opacity={o}>
              <rect x={cx - 28} y={cy + chh / 2 + (L.short ? 3 : 6)} width={56} height={L.short ? 13 : 16} fill="var(--color-high)" />
              <text x={cx} y={cy + chh / 2 + (L.short ? 13 : 17.5)} fontSize={fs(L.short ? 9.5 : 10.5)} textAnchor="middle" fill="var(--color-paper)" fontWeight={500}>Missing</text>
            </g>
          );
        })}

        {/* draw lines: from the check-in marker up to the cars it picked */}
        {PICKS.map((draw, k) => {
          const a = span(t, T[k], T[k] + ACT);
          const o = ease(span(a, 0, 0.4)) * (1 - span(t, T[k] + ACT, T[k] + ACT + 0.05));
          if (o <= 0) return null;
          return draw.map((i) => {
            const [cx, cy] = carCenter(L, i);
            const len = Math.hypot(cx - X(T[k]), cy - L.axisY);
            return <line key={`${k}-${i}`} x1={X(T[k])} y1={L.axisY - 6} x2={cx} y2={cy + chh / 2 + 5} stroke="var(--color-brand-deep)" strokeWidth={1} opacity={o * 0.7} strokeDasharray={len} strokeDashoffset={len * (1 - ease(span(a, 0, 0.45)))} />;
          });
        })}

        {/* chance chart */}
        {[0.5, 1].map((v) => <line key={v} x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke="var(--color-line)" />)}
        <g clipPath={`url(#${clip})`}>
          <path d={area} fill="var(--color-brand)" opacity={0.7} />
          <path d={d} fill="none" stroke="var(--color-brand-deep)" strokeWidth={2} />
        </g>
        {[0.5, 1].map((v) => (
          <text key={v} x={x1} y={Y(v) - 5} fontSize={fs(10.5)} textAnchor="end" fill="var(--color-ash-500)" className="figure">{v * 100}%</text>
        ))}
        {T.map((f, k) => {
          const o = ease(span(t, f + 0.02, f + 0.05));
          return o > 0 && (
            <text key={k} x={X(f) + 5} y={Y(CHANCE[k]) - 6} fontSize={fs(L.short ? 10.5 : 12)} fill="var(--color-brand-deep)" opacity={o} className="figure">
              {Math.round(CHANCE[k] * 100)}%
            </text>
          );
        })}
        <text x={x0} y={y0 - (L.short ? 12 : 4)} fontSize={fs(L.short ? 11.5 : 13)} fill="var(--color-ink)" fontWeight={500}>Chance a missing car is found this year</text>
        <text x={x0} y={y0 + (L.short ? 34 : 56)} fontSize={fs(L.short ? 38 : 64)} fill="var(--color-ink)" className="figure">
          {Math.round(chance * 100)}%
        </text>

        {/* year axis */}
        <line x1={x0} x2={x1} y1={L.axisY} y2={L.axisY} stroke="var(--color-ink)" />
        {MONTHS.map((m, i) => (
          <text key={m} x={X((i + 0.5) / 12)} y={L.axisY + 17} fontSize={fs(L.short ? 10 : 11)} textAnchor="middle" fill="var(--color-ash-500)">{L.short ? m[0] : m}</text>
        ))}
        {MONTHS.map((m, i) => i > 0 && <line key={m} x1={X(i / 12)} x2={X(i / 12)} y1={L.axisY} y2={L.axisY + 4} stroke="var(--color-ash-300)" />)}
        {T.map((f, k) => {
          const hit = t >= f;
          const s = L.short ? 9 : 11;
          return (
            <g key={k}>
              <rect x={X(f) - s / 2} y={L.axisY - s / 2} width={s} height={s} fill={hit ? (k === FOUND_AT ? "var(--color-high)" : "var(--color-ink)") : "var(--color-paper)"} stroke={k === FOUND_AT && hit ? "var(--color-high)" : "var(--color-ink)"} />
            </g>
          );
        })}
        <line x1={cursor} x2={cursor} y1={y0 - 2} y2={L.axisY} stroke="var(--color-brand-deep)" opacity={t > 0 && t < 1 ? 0.5 : 0} />
        {!L.short && <text x={x1} y={L.axisY + 34} fontSize={fs(11.5)} textAnchor="end" fill="var(--color-ash-500)">
          <tspan fill="var(--color-ink)">■</tspan> check-in, <tspan className="figure">3</tspan> cars drawn at random
        </text>}
        {L.note.map((line, i) => (
          <text key={i} x={x0} y={L.noteY + i * 16} fontSize={fs(L.short ? 10.5 : 11.5)} fill="var(--color-ash-500)">{line}</text>
        ))}
      </g>
    </svg>
  );
}

export function Sampling({ p }: { p: number }) {
  const t = span(p, 0.04, 0.9);
  return (
    <div
      className="relative h-full w-full"
      role="img"
      aria-label={`A year of six check-ins, each drawing three of the 24 cars data couldn't verify. One of three hidden missing cars is drawn at check-in ${FOUND_AT + 1}. The chance of finding a missing car climbs to ${Math.round(CHANCE[5] * 100)}% by the end of the year.`}
    >
      <Picture L={TALL} t={t} className="absolute inset-0 h-full w-full lg:hidden" />
      <Picture L={WIDE} t={t} className="absolute inset-0 hidden h-full w-full lg:block" />
    </div>
  );
}
