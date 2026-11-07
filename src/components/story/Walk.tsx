"use client";
import { ease, span } from "./Scene";
import { CAR_COUNT, CarTop, COLS, FONT, Kerb, LOT_W, LotLines, LX, LY, SH, STALLS, SW, VB_H, VB_W, aisleY } from "./WalkLot";

/**
 * Chapter 1: an auditor walks the lot, stopping at every column to tick the
 * cars on both sides. The clock and the bill run with the walk; the lot is
 * covered only near the end. Two stalls sold last week stay unnoticed until
 * the end, where they show a faint red outline.
 */

type Pt = { x: number; y: number; stop: boolean };

/** Serpentine route: in on aisle 0 left to right, round the end, back along aisle 1. */
const ROUTE: Pt[] = (() => {
  const a0 = aisleY(0), a1 = aisleY(1);
  const pts: Pt[] = [{ x: -22, y: a0, stop: false }];
  for (let c = 0; c < COLS; c++) pts.push({ x: c * SW + SW / 2, y: a0, stop: true });
  pts.push({ x: LOT_W + 6, y: a0, stop: false }, { x: LOT_W + 6, y: a1, stop: false });
  for (let c = COLS - 1; c >= 0; c--) pts.push({ x: c * SW + SW / 2, y: a1, stop: true });
  pts.push({ x: -22, y: a1, stop: false });
  return pts;
})();

/** Time model: walking is proportional to distance; each stop adds a pause to tick the cars. */
const PAUSE = 34; // in distance units
const TIMES: number[] = (() => {
  const t = [0];
  for (let i = 1; i < ROUTE.length; i++) {
    const a = ROUTE[i - 1], b = ROUTE[i];
    t.push(t[i - 1] + Math.hypot(b.x - a.x, b.y - a.y) + (b.stop ? PAUSE : 0));
  }
  const total = t[t.length - 1];
  return t.map((v) => v / total);
})();

/** When each car gets ticked (fraction of the walk): on arrival at its column in its aisle. */
const SEEN_AT: number[] = STALLS.map((d) => {
  const aisle = d.r < 2 ? 0 : 1;
  const idx = aisle === 0 ? 1 + d.c : 1 + COLS + 2 + (COLS - 1 - d.c);
  const segStart = TIMES[idx - 1], segEnd = TIMES[idx];
  // arrival happens before the pause at the stop
  const a = ROUTE[idx - 1], b = ROUTE[idx];
  const walk = Math.hypot(b.x - a.x, b.y - a.y);
  return segStart + (segEnd - segStart) * (walk / (walk + PAUSE)) + 0.004;
});

function walkerAt(w: number) {
  let i = 1;
  while (i < TIMES.length - 1 && TIMES[i] < w) i++;
  const a = ROUTE[i - 1], b = ROUTE[i];
  const seg = (w - TIMES[i - 1]) / (TIMES[i] - TIMES[i - 1] || 1);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const moveShare = b.stop ? len / (len + PAUSE) : 1;
  const k = Math.min(1, Math.max(0, seg / moveShare));
  const f = b.stop ? ease(k) : k;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, i, f };
}

const clock = (w: number) => {
  const mins = 8 * 60 + Math.floor(w * 7.5 * 60 / 5) * 5;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
};

export function Walk({ p }: { p: number }) {
  const w = span(p, 0.05, 0.86);
  const reveal = ease(span(p, 0.86, 0.92));
  const pos = walkerAt(w);
  const ticked = STALLS.reduce((n, d, i) => n + (d.kind === "car" && w >= SEEN_AT[i] ? 1 : 0), 0);
  const cost = Math.round((w * 400) / 10) * 10;

  // trail: route up to the walker
  const trail = ROUTE.slice(0, pos.i).map((pt) => `${pt.x},${pt.y}`).concat(`${pos.x},${pos.y}`).join(" ");

  return (
    <div className="relative h-full w-full" role="img" aria-label={`A dealer lot of ${CAR_COUNT} cars, walked aisle by aisle by an auditor from 08:00 to 15:30 at a cost of €400. Every car is ticked, but two stalls emptied by sales last week go unnoticed.`}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden style={FONT}>
        {/* readout */}
        <g fill="var(--color-ink)">
          <text x={LX} y={34} fontSize={27} className="figure">{clock(w)}</text>
          <text x={LX} y={48} fontSize={8} fill="var(--color-ash-500)">Auditor on site</text>
          <text x={VB_W / 2 + 18} y={34} fontSize={27} className="figure" textAnchor="middle">{ticked}</text>
          <text x={VB_W / 2 + 18} y={48} fontSize={8} fill="var(--color-ash-500)" textAnchor="middle">Cars ticked</text>
          <text x={LX + LOT_W} y={34} fontSize={27} className="figure" textAnchor="end">€{cost}</text>
          <text x={LX + LOT_W} y={48} fontSize={8} fill="var(--color-ash-500)" textAnchor="end">Cost of the visit</text>
          <line x1={LX} x2={LX + LOT_W} y1={56} y2={56} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
        </g>

        <g transform={`translate(${LX} ${LY})`}>
          <Kerb />
          <LotLines />

          {STALLS.map((d, i) => {
            if (d.kind === "empty") return null;
            if (d.kind === "sold") {
              if (reveal <= 0) return null;
              const labelY = d.down ? d.y + SH + 10 : d.y - 5;
              return (
                <g key={i} opacity={reveal}>
                  <rect x={d.x + 3} y={d.y + 5} width={SW - 6} height={SH - 10} fill="var(--color-high-soft)" stroke="var(--color-high)" strokeDasharray="2 2" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  <text x={d.cx} y={labelY} fontSize={7} textAnchor="middle" fill="var(--color-high)">Sold last week</text>
                </g>
              );
            }
            const seen = w >= SEEN_AT[i];
            return (
              <g key={i}>
                <CarTop x={d.x} y={d.y} down={d.down} fill={seen ? "var(--color-paper)" : "var(--color-ash-300)"} outline={seen ? "var(--color-ink)" : undefined} glass={seen ? "rgba(15,30,51,0.45)" : "rgba(15,30,51,0.18)"} />
                {seen && <path d={`M${d.cx - 3.5} ${d.cy} l2.5 2.6 l5 -5.4`} fill="none" stroke="var(--color-go)" strokeWidth={1.6} strokeLinecap="square" />}
              </g>
            );
          })}

          {/* the walker */}
          <polyline points={trail} fill="none" stroke="var(--color-brand-deep)" strokeOpacity={0.4 * (1 - 0.75 * reveal)} strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          <circle cx={pos.x} cy={pos.y} r={9} fill="var(--color-brand-deep)" opacity={0.12} />
          <circle cx={pos.x} cy={pos.y} r={4} fill="var(--color-brand-deep)" stroke="var(--color-paper)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}
