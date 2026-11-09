"use client";
import { ASSUMPTIONS } from "@/config/assumptions";
import { ease, span } from "./Scene";
import { CarTop, FONT } from "./WalkLot";

/**
 * Chapter 6: a spot check goes to a local, not an auditor. A visit is posted
 * around the dealer's lot and reaches the verifiers nearby. One accepts and
 * drives over, finds the few cars on the list, and is paid a flat fee.
 */

const VB_W = 330, VB_H = 362;
const FEE = ASSUMPTIONS.gigCheckCost;
const AUDITOR = ASSUMPTIONS.auditorVisitCost;

// Map: a few streets around one block that holds the lot.
const MAP = { x: 0, y: 70, w: VB_W, h: 270 };
const STREETS_X = [22, 104, 226, 308];
const STREETS_Y = [88, 154, 256, 330];
const LOT = { x: 112, y: 162, w: 106, h: 86 };
const STALL_W = 21, STALL_H = 40;
const STALLS = Array.from({ length: 5 }, (_, i) => ({ x: LOT.x + 1 + i * STALL_W, y: LOT.y + 30 }));
/** The cars on the visit's list, and when each is found. */
const SAMPLED = [0, 2, 3];
const FOUND_AT = [0.54, 0.6, 0.66];
const CENTER = { x: LOT.x + LOT.w / 2, y: LOT.y + LOT.h / 2 };

/** Verifiers around town. The first one takes the visit. */
const PEOPLE = [
  { x: 308, y: 104 },
  { x: 48, y: 112 },
  { x: 168, y: 104 },
  { x: 276, y: 238 },
  { x: 60, y: 214 },
  { x: 150, y: 300 },
  { x: 272, y: 300 },
  { x: 22, y: 296 },
];
const RING_MAX = 200;
const ringAt = (i: number) => Math.hypot(PEOPLE[i].x - CENTER.x, PEOPLE[i].y - CENTER.y) / RING_MAX;

/** The drive: along the streets to the lot's gate. */
const ROUTE = [
  { x: 308, y: 104 },
  { x: 308, y: 154 },
  { x: 226, y: 154 },
  { x: 226, y: 206 },
];
const LEGS = ROUTE.slice(1).map((pt, i) => Math.hypot(pt.x - ROUTE[i].x, pt.y - ROUTE[i].y));
const ROUTE_LEN = LEGS.reduce((a, b) => a + b, 0);
function along(t: number) {
  let d = t * ROUTE_LEN;
  for (let i = 0; i < LEGS.length; i++) {
    if (d <= LEGS[i] || i === LEGS.length - 1) {
      const k = Math.min(1, d / LEGS[i]);
      return { x: ROUTE[i].x + (ROUTE[i + 1].x - ROUTE[i].x) * k, y: ROUTE[i].y + (ROUTE[i + 1].y - ROUTE[i].y) * k };
    }
    d -= LEGS[i];
  }
  return ROUTE[ROUTE.length - 1];
}
const ROUTE_D = `M${ROUTE.map((pt) => `${pt.x} ${pt.y}`).join(" L")}`;

export function Verifiers({ p }: { p: number }) {
  const ring = span(p, 0.03, 0.22);
  const accept = ease(span(p, 0.25, 0.3));
  const list = ease(span(p, 0.27, 0.33));
  const drive = ease(span(p, 0.31, 0.48));
  const paid = ease(span(p, 0.78, 0.86));
  const me = along(drive);
  const found = FOUND_AT.reduce((n, t) => n + (p >= t ? 1 : 0), 0);

  return (
    <div
      className="relative h-full w-full"
      role="img"
      aria-label={`A map around a dealer lot. A spot check is posted to verifiers nearby; one accepts, drives over, finds the three cars on the list and is paid €${FEE}, against €${AUDITOR} for an auditor's visit.`}
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden style={FONT}>
        <defs>
          <clipPath id="verifier-map"><rect x={MAP.x} y={MAP.y} width={MAP.w} height={MAP.h} /></clipPath>
        </defs>

        {/* readout: what the visit costs, next to what an auditor costs */}
        <g>
          <text x={8} y={34} className="figure" fill="var(--color-ink)">
            <tspan fontSize={27}>€{FEE}</tspan>
          </text>
          <text x={8} y={48} fontSize={8} fill="var(--color-ash-500)">Local verifier, per visit</text>
          <text x={VB_W - 8} y={34} fontSize={27} className="figure" textAnchor="end" fill="var(--color-ash-300)">€{AUDITOR}</text>
          <text x={VB_W - 8} y={48} fontSize={8} fill="var(--color-ash-500)" textAnchor="end">Auditor, per visit</text>
          <line x1={8} x2={VB_W - 8} y1={56} y2={56} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
        </g>

        <g clipPath="url(#verifier-map)">
          {/* streets */}
          <g stroke="var(--color-mist)" strokeWidth={9} strokeLinecap="square">
            {STREETS_X.map((x) => <line key={`x${x}`} x1={x} x2={x} y1={MAP.y} y2={MAP.y + MAP.h} />)}
            {STREETS_Y.map((y) => <line key={`y${y}`} x1={MAP.x} x2={MAP.x + MAP.w} y1={y} y2={y} />)}
          </g>

          {/* the visit, posted around the lot */}
          {ring > 0 && ring < 1 && (
            <circle cx={CENTER.x} cy={CENTER.y} r={RING_MAX * ease(ring)} fill="none" stroke="var(--color-brand-deep)" strokeOpacity={0.6 * (1 - ring)} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
          )}

          {/* the lot */}
          <rect x={LOT.x - 3} y={LOT.y - 3} width={LOT.w + 6} height={LOT.h + 6} fill="var(--color-paper)" stroke="var(--color-ash-500)" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
          <text x={LOT.x + 2} y={LOT.y + 14} fontSize={8} fill="var(--color-ash-500)">Dealer lot</text>
          <g stroke="var(--color-ash-300)" strokeWidth={1} vectorEffect="non-scaling-stroke">
            {Array.from({ length: STALLS.length + 1 }, (_, i) => (
              <line key={i} x1={LOT.x + 1 + i * STALL_W} x2={LOT.x + 1 + i * STALL_W} y1={LOT.y + 30} y2={LOT.y + 30 + STALL_H} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {STALLS.map((st, i) => {
            const k = SAMPLED.indexOf(i);
            const on = k >= 0 ? span(p, FOUND_AT[k], FOUND_AT[k] + 0.03) : 0;
            return (
              <g key={i}>
                <CarTop x={st.x - 0.5} y={st.y} down={false} fill="var(--color-ash-300)" glass="rgba(15,30,51,0.18)" />
                {k >= 0 && list > 0 && (
                  <rect x={st.x + 1.5} y={st.y + 2} width={STALL_W - 4} height={STALL_H - 4} fill="none" stroke="var(--color-brand-deep)" strokeDasharray="2 2" strokeWidth={1} opacity={list * (1 - on)} vectorEffect="non-scaling-stroke" />
                )}
                {on > 0 && (
                  <g opacity={on}>
                    <CarTop x={st.x - 0.5} y={st.y} down={false} fill="var(--color-lime)" glass="rgba(15,30,51,0.5)" />
                    <path d={`M${st.x + 6} ${st.y - 6} l3 3 l6 -6`} fill="none" stroke="var(--color-go)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </g>
                )}
              </g>
            );
          })}
          <text x={LOT.x + LOT.w - 2} y={LOT.y + 14} fontSize={8} textAnchor="end" className="figure" fill="var(--color-go)" opacity={list}>
            {found} of {SAMPLED.length}
          </text>

          {/* the route, drawn as the verifier drives */}
          <path d={ROUTE_D} fill="none" stroke="var(--color-brand-deep)" strokeWidth={1.5} strokeDasharray="1 1" pathLength={1} strokeDashoffset={1 - drive} opacity={accept} />

          {/* verifiers nearby: each one hears about the visit as the ring reaches them */}
          {PEOPLE.map((pt, i) => {
            const heard = span(p, 0.03 + 0.19 * ringAt(i), 0.03 + 0.19 * ringAt(i) + 0.08);
            const mine = i === 0;
            const fade = mine ? 1 : 1 - 0.65 * accept;
            const at = mine ? me : pt;
            return (
              <g key={i} opacity={fade}>
                {heard > 0 && heard < 1 && <circle cx={pt.x} cy={pt.y} r={4 + 14 * ease(heard)} fill="none" stroke="var(--color-brand-deep)" strokeOpacity={0.7 * (1 - heard)} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
                <circle cx={at.x} cy={at.y} r={mine ? 3.6 + 1.4 * accept : 3.6} fill={mine && accept > 0 ? "var(--color-brand-deep)" : heard > 0 ? "var(--color-ink)" : "var(--color-ash-500)"} stroke="var(--color-paper)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}

          {/* who took it */}
          <g opacity={accept * (1 - span(p, 0.46, 0.5))}>
            <text x={ROUTE[0].x - 9} y={ROUTE[0].y - 9} fontSize={8} textAnchor="end" fill="var(--color-brand-deep)">Accepted, 4 km away</text>
          </g>

          {/* paid */}
          <g opacity={paid} transform={`translate(0 ${-8 * paid})`}>
            <text x={ROUTE[ROUTE.length - 1].x + 9} y={ROUTE[ROUTE.length - 1].y - 8} fontSize={14} className="figure" fill="var(--color-go)">+€{FEE}</text>
          </g>
        </g>

        <text x={8} y={VB_H - 6} fontSize={8} fill="var(--color-ash-500)" opacity={ease(span(p, 0.86, 0.94))}>About 25 minutes on site, with photos of each car.</text>
      </svg>
    </div>
  );
}
