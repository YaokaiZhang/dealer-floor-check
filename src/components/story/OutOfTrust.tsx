"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ease, span } from "./Scene";

/**
 * Chapter 6: one financed car, and the evidence converging on it. A marketplace
 * listing marked sold starts the payoff clock and a friendly reminder in the
 * dealer app; the register shows a pending owner change; the payoff window
 * closes empty. The car turns from lime to red. The response matches the
 * evidence: a sale only gets a reminder, a missed payoff an alert, and both
 * sources agreeing a spot check today, with the officer asked to pause credit.
 */

const SANS = { fontFamily: "var(--font-sans)" } as const;
const MONO = { fontFamily: "var(--font-mono)" } as const;
const FG = "var(--color-ink)";
const BG = "var(--color-paper)";
const LIME = "var(--color-lime)";
const HIGH = "var(--color-high)";
const INK = "var(--color-ink)";

/** Card base sizes, in card units (scaled per layout). */
const SMALL = { w: 164, h: 84 };
const BIG = { w: 164, h: 116 };
const LADDER = { w: 150, h: 124 };
/** Radius of the ring around the car, in car units; signal lines stop there. */
const RING = 64;

type Pt = { x: number; y: number };
type Box = Pt & { s: number };
type Layout = {
  vw: number; vh: number;
  car: Box;
  market: Box; registry: Box; map: Box; payoff: Box; ladder: Box;
  /** Where each signal line leaves its card, in view units. */
  from: { market: Pt; registry: Pt; map: Pt; payoff: Pt };
  /** Response line: car edge to ladder. */
  out: [Pt, Pt];
};

const WIDE: Layout = (() => {
  const vw = 800, vh = 680, s = 1.3, m = 16;
  const cw = SMALL.w * s;
  const market = { x: m, y: m, s };
  const registry = { x: vw - m - cw, y: m, s };
  const map = { x: m, y: vh - m - BIG.h * s, s };
  const payoff = { x: vw - m - cw, y: vh - m - BIG.h * s, s };
  const ladder = { x: vw / 2 - (LADDER.w * s) / 2, y: vh - m - LADDER.h * s - 6, s };
  return {
    vw, vh, market, registry, map, payoff, ladder,
    car: { x: vw / 2, y: 290, s: 1.75 },
    from: {
      market: { x: market.x + cw, y: market.y + SMALL.h * s },
      registry: { x: registry.x, y: registry.y + SMALL.h * s },
      map: { x: map.x + cw, y: map.y },
      payoff: { x: payoff.x, y: payoff.y },
    },
    out: [{ x: vw / 2, y: 290 + RING * 1.75 }, { x: vw / 2, y: ladder.y + 2 }],
  };
})();

const NARROW: Layout = (() => {
  const vw = 360, vh = 424, s = 1, m = 4;
  const market = { x: m, y: m, s };
  const registry = { x: vw - m - SMALL.w, y: m, s };
  const map = { x: m, y: vh - m - BIG.h, s };
  const payoff = { x: vw - m - BIG.w, y: vh - m - BIG.h, s };
  const ladder = { x: vw - m - LADDER.w - 2, y: 112, s: 0.98 };
  return {
    vw, vh, market, registry, map, payoff, ladder,
    car: { x: 92, y: 178, s: 1 },
    from: {
      market: { x: market.x + 70, y: market.y + SMALL.h },
      registry: { x: registry.x + 20, y: registry.y + SMALL.h },
      map: { x: map.x + 70, y: map.y },
      payoff: { x: payoff.x + 10, y: payoff.y },
    },
    out: [{ x: 92 + RING, y: 178 }, { x: ladder.x - 4, y: 178 }],
  };
})();

/** Width below which the stacked, compact layout is used. */
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

/** Card appearance: a quick snap in. */
function Card({ box, w, h, t, bare, children }: { box: Box; w: number; h: number; t: number; bare?: boolean; children: ReactNode }) {
  if (t <= 0) return null;
  const e = ease(t);
  const k = 0.94 + 0.06 * e;
  return (
    <g transform={`translate(${box.x} ${box.y + (1 - e) * 10}) scale(${box.s * k})`} opacity={e}>
      {!bare && <rect width={w} height={h} fill={FG} fillOpacity={0.04} stroke={FG} strokeOpacity={0.3} vectorEffect="non-scaling-stroke" />}
      {children}
    </g>
  );
}

function Head({ children, x = 10, anchor = "start", o = 0.6 }: { children: ReactNode; x?: number; anchor?: "start" | "end"; o?: number }) {
  return <text x={x} y={16} fontSize={10} fill={FG} fillOpacity={o} textAnchor={anchor} style={SANS}>{children}</text>;
}

/** A signal line drawing from its card towards the car, with a pulse at its head. */
function Signal({ a, c, r, t, alert }: { a: Pt; c: Pt; r: number; t: number; alert: number }) {
  if (t <= 0) return null;
  const d = Math.hypot(c.x - a.x, c.y - a.y);
  const b = { x: c.x - ((c.x - a.x) / d) * r, y: c.y - ((c.y - a.y) / d) * r };
  const e = ease(t);
  const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={x} y2={y} stroke={FG} strokeOpacity={0.5 * (1 - alert)} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {alert > 0 && <line x1={a.x} y1={a.y} x2={x} y2={y} stroke={HIGH} strokeOpacity={alert} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      <circle cx={a.x} cy={a.y} r={2.5} fill={alert > 0.5 ? HIGH : FG} />
      {t < 1 && <circle cx={x} cy={y} r={3} fill={LIME} />}
    </g>
  );
}

export function OutOfTrust({ p }: { p: number }) {
  const { ref, narrow } = useNarrow();
  const L = narrow ? NARROW : WIDE;

  // Phases follow the chapter's five steps (fifths of p).
  const tMarket = span(p, 0.05, 0.1), lMarket = span(p, 0.09, 0.17), tSold = span(p, 0.11, 0.14);
  const tReg = span(p, 0.22, 0.27), lReg = span(p, 0.26, 0.34), tPending = span(p, 0.27, 0.31);
  const tMap = span(p, 0.41, 0.45), drive = ease(span(p, 0.44, 0.57)), lMap = span(p, 0.5, 0.58);
  const tPay = span(p, 0.61, 0.64), fill = span(p, 0.63, 0.72), tNo = span(p, 0.72, 0.75), lPay = span(p, 0.72, 0.78);
  const alert = ease(span(p, 0.74, 0.79));
  const tLadder = span(p, 0.81, 0.84), lOut = span(p, 0.81, 0.85);
  const rung = [span(p, 0.84, 0.87), span(p, 0.87, 0.9), span(p, 0.89, 0.92)];

  const car = { x: L.car.x, y: L.car.y };
  const R = RING * L.car.s;

  return (
    <div ref={ref} className="relative h-full w-full" role="img" aria-label="A financed Kia Niro EV, plate RKR-197, loan €41,900. A marketplace listing is marked sold, which sends the dealer a payoff reminder. The register shows a pending owner change. Two business days pass with no payoff. The car turns red. The response matches the evidence: a sale gets a reminder, a missed payoff an alert, and with both sources agreeing, as here, a spot check today and a request to the officer to pause credit.">
      <svg aria-hidden viewBox={`0 0 ${L.vw} ${L.vh}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-x-0 top-0 bottom-8 h-[calc(100%-2rem)] w-full lg:bottom-0 lg:h-full">
        {/* Converging signal lines, under everything else */}
        <Signal a={L.from.market} c={car} r={R} t={lMarket} alert={alert} />
        <Signal a={L.from.registry} c={car} r={R} t={lReg} alert={alert} />
        <Signal a={L.from.map} c={car} r={R} t={lMap} alert={alert} />
        <Signal a={L.from.payoff} c={car} r={R} t={lPay} alert={alert} />
        {lOut > 0 && (
          <line x1={L.out[0].x} y1={L.out[0].y} x2={L.out[0].x + (L.out[1].x - L.out[0].x) * ease(lOut)} y2={L.out[0].y + (L.out[1].y - L.out[0].y) * ease(lOut)} stroke={LIME} strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        )}

        {/* The car */}
        <g transform={`translate(${car.x} ${car.y}) scale(${L.car.s})`}>
          <circle r={RING} fill="none" stroke={alert > 0.5 ? HIGH : FG} strokeOpacity={0.3} strokeWidth={1} vectorEffect="non-scaling-stroke" className="animate-pulse-dot motion-reduce:animate-none" />
          <circle r={RING + 14 * alert} fill="none" stroke={HIGH} strokeOpacity={alert * (1 - alert) * 2.4} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <rect x={-50} y={-24} width={100} height={48} rx={11} fill={LIME} stroke={FG} strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />
          <rect x={-50} y={-24} width={100} height={48} rx={11} fill={HIGH} opacity={alert} />
          <rect x={14} y={-19} width={15} height={38} rx={3.5} fill={INK} fillOpacity={0.55} />
          <rect x={-38} y={-17} width={9} height={34} rx={2.5} fill={INK} fillOpacity={0.35} />
          <rect x={-22} y={-20} width={30} height={40} rx={4} fill={INK} fillOpacity={0.08} />
          <g style={SANS} textAnchor="middle">
            <text y={40} fontSize={9.5} fill={FG}>Kia Niro EV <tspan style={MONO} fillOpacity={0.7}> RKR-197</tspan></text>
            <text y={52} fontSize={9} fill={FG} fillOpacity={0.65} className="figure">Loan €41,900</text>
          </g>
          {alert > 0 && (
            <g opacity={alert} transform={`translate(0 ${-44 - (1 - alert) * 6})`}>
              <rect x={-44} y={-11} width={88} height={20} fill={HIGH} />
              <text y={3} fontSize={11} fontWeight={500} textAnchor="middle" fill={BG} style={SANS}>Out of trust</text>
            </g>
          )}
        </g>
        {/* 1. Marketplace listing */}
        <Card box={L.market} w={SMALL.w} h={SMALL.h} t={tMarket}>
          <Head>Marketplace</Head>
          {tSold > 0 && (
            <g opacity={ease(tSold)} transform={`translate(${154 - 36} ${6}) scale(${1.25 - 0.25 * ease(tSold)})`}>
              <rect width={36} height={16} fill={FG} />
              <text x={18} y={11.5} fontSize={10} fontWeight={600} textAnchor="middle" fill={BG} style={SANS}>Sold</text>
            </g>
          )}
          <rect x={10} y={26} width={46} height={48} fill={FG} fillOpacity={0.06} stroke={FG} strokeOpacity={0.2} vectorEffect="non-scaling-stroke" />
          <rect x={22} y={36} width={22} height={30} rx={5} fill={FG} fillOpacity={0.55} />
          <rect x={25} y={40} width={16} height={6} rx={1.5} fill={INK} fillOpacity={0.5} />
          <text x={66} y={38} fontSize={11} fill={FG} style={SANS}>Kia Niro EV</text>
          <text x={66} y={52} fontSize={9.5} fill={FG} fillOpacity={0.55} style={SANS}>2023 · 18,400 km</text>
          <text x={66} y={71} fontSize={14} fill={FG} className="figure" style={SANS}>€38,900</text>
        </Card>

        {/* 2. Registry */}
        <Card box={L.registry} w={SMALL.w} h={SMALL.h} t={tReg}>
          <Head>Vehicle register</Head>
          <rect x={10} y={26} width={62} height={20} fill="none" stroke={FG} strokeOpacity={0.8} vectorEffect="non-scaling-stroke" />
          <text x={41} y={40} fontSize={11} textAnchor="middle" fill={FG} style={MONO}>RKR-197</text>
          <text x={80} y={40} fontSize={10} fill={FG} fillOpacity={0.55} style={SANS}>Laakso Autot</text>
          <g opacity={ease(tPending)}>
            <circle cx={15} cy={66} r={3.5} fill="var(--color-medium)" />
            <text x={25} y={70} fontSize={11} fill={FG} style={SANS}>Owner change pending</text>
          </g>
        </Card>

        {/* 3. Dealer app: the sale only triggers a friendly payoff reminder */}
        <Card box={L.map} w={BIG.w} h={BIG.h} t={tMap}>
          <Head>Dealer app</Head>
          <Head x={154} anchor="end" o={0.4}>what the dealer sees</Head>
          <rect x={10} y={26} width={144} height={52} fill={FG} fillOpacity={0.04} stroke={FG} strokeOpacity={0.3} vectorEffect="non-scaling-stroke" />
          <text x={18} y={44} fontSize={11} fontWeight={600} fill={FG} style={SANS}>Payoff due</text>
          <text x={18} y={60} fontSize={9.5} fill={FG} fillOpacity={0.65} style={SANS}>Kia Niro EV · <tspan className="figure">€41,900</tspan></text>
          <text x={18} y={72} fontSize={9} fill={FG} fillOpacity={0.5} style={SANS}>Thanks for the sale. Due in 2 days</text>
          <g opacity={ease(drive)}>
            <circle cx={16} cy={94} r={5} fill={LIME} />
            <path d="M13.5 94 l2 2 l3.5 -4" fill="none" stroke={INK} strokeWidth={1.4} />
            <text x={26} y={98} fontSize={10.5} fill={FG} style={SANS}>Reminder sent, no suspicion</text>
          </g>
        </Card>

        {/* 4. Payoff window: two business days, the bank's view */}
        <Card box={L.payoff} w={BIG.w} h={BIG.h} t={tPay}>
          <Head>Payoff window</Head>
          <Head x={154} anchor="end" o={0.4}>bank view</Head>
          {["Mon", "Tue"].map((d, i) => {
            const f = Math.min(1, Math.max(0, fill * 2 - i));
            return (
              <g key={d} transform={`translate(${10 + i * 74} 26)`}>
                <rect width={70} height={30} fill={FG} fillOpacity={0.04} stroke={FG} strokeOpacity={0.3} vectorEffect="non-scaling-stroke" />
                <rect width={70 * f} height={30} fill={FG} fillOpacity={0.2} />
                <text x={6} y={19} fontSize={10} fill={FG} fillOpacity={0.8} style={SANS}>{d}</text>
              </g>
            );
          })}
          <text x={10} y={74} fontSize={10} fill={FG} fillOpacity={0.55} style={SANS}>Due <tspan className="figure">€41,900</tspan></text>
          <g opacity={ease(tNo)}>
            <rect x={10} y={84} width={144} height={22} fill={HIGH} fillOpacity={0.18} stroke={HIGH} vectorEffect="non-scaling-stroke" />
            <path d="M18 90 l10 10 M28 90 l-10 10" stroke={HIGH} strokeWidth={2} />
            <text x={36} y={99} fontSize={11} fontWeight={600} fill={FG} style={SANS}>No payoff</text>
          </g>
        </Card>

        {/* 5. The response matches the evidence; this car has all four signals */}
        <Card box={L.ladder} w={LADDER.w} h={LADDER.h} t={tLadder} bare>
          <text x={0} y={12} fontSize={10} fill={FG} fillOpacity={0.6} style={SANS}>Matched to evidence</text>
          {[
            { label: "Reminder", when: "Sold", y: 96 },
            { label: "Alert", when: "No payoff", y: 63 },
            { label: "Spot check today", when: "Both agree", y: 30 },
          ].map((r, i) => {
            const hit = i === 2;
            const t = ease(rung[i]);
            return (
              <g key={r.label} transform={`translate(0 ${r.y})`} opacity={hit ? t : 0.25 + 0.75 * t}>
                <text x={0} y={17} fontSize={9.5} fill={FG} fillOpacity={hit ? 0.8 : 0.45} style={SANS}>{r.when}</text>
                {hit ? (
                  <>
                    <rect x={52} width={94} height={26} fill={HIGH} fillOpacity={0.18} stroke={HIGH} vectorEffect="non-scaling-stroke" />
                    <text x={60} y={17} fontSize={10.5} fontWeight={600} fill={FG} style={SANS}>{r.label}</text>
                  </>
                ) : (
                  <>
                    <rect x={52} width={94} height={26} fill="none" stroke={FG} strokeOpacity={0.35} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                    <text x={60} y={17} fontSize={10.5} fill={FG} fillOpacity={0.5} style={SANS}>{r.label}</text>
                  </>
                )}
              </g>
            );
          })}
        </Card>
      </svg>
    </div>
  );
}
