"use client";
import { ease, span } from "./Scene";
import { CAR_COUNT, CarTop, CONNECTED_COUNT, FONT, Kerb, LOT_H, LOT_W, LotLines, LX, LY, SH, STALLS, SW, VB_H, VB_W } from "./WalkLot";

/**
 * Chapter 2: the same lot as chapter 1. A geofence is drawn round it, then the
 * connected cars report in: a pulse each and a lime fill, spreading through the
 * lot in a wave, with nobody on site. Registry and marketplace feeds join last,
 * and flag the two stalls emptied by sales. The rest stay grey for check-ins.
 */

const FENCE = 19;

/** When each connected car reports (p): a wave from the middle of the lot, with seeded jitter. */
const REPORT_AT: number[] = (() => {
  let s = 5;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ox = LOT_W * 0.42, oy = LOT_H * 0.5;
  const max = Math.hypot(LOT_W * 0.58, LOT_H * 0.5);
  return STALLS.map((d) => {
    const j = rnd();
    if (!d.connected) return Infinity;
    return 0.2 + 0.4 * (Math.hypot(d.cx - ox, d.cy - oy) / max) + 0.05 * j;
  });
})();

/** A handful of reporting cars keep a slow idle ping in the finished picture. */
const IDLE = STALLS.map((d, i) => i).filter((i) => STALLS[i].connected).filter((_, k) => k % 6 === 2);

const FEEDS = [
  { label: "Registry", x: 0, w: 48 },
  { label: "Marketplace", x: 56, w: 64 },
];

export function Signals({ p }: { p: number }) {
  const fence = ease(span(p, 0.05, 0.2));
  const feeds = ease(span(p, 0.7, 0.78));
  const travel = span(p, 0.74, 0.84);
  const flag = ease(span(p, 0.83, 0.9));
  const verified = REPORT_AT.reduce((n, t) => n + (p >= t + 0.012 ? 1 : 0), 0);
  const fenceY = LOT_H + FENCE; // bottom of the geofence, lot coords
  const badgeY = fenceY + 7;

  return (
    <div
      className="relative h-full w-full"
      role="img"
      aria-label={`The same lot inside a geofence: ${CONNECTED_COUNT} of ${CAR_COUNT} cars verified automatically by their own position reports, with nobody on site. Registry and marketplace feeds watch for sales and flag two sold cars. The other cars stay unverified.`}
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden style={FONT}>
        {/* readout */}
        <g fill="var(--color-ink)">
          <text x={LX} y={34} className="figure">
            <tspan fontSize={27}>{verified}</tspan>
            <tspan fontSize={15} fill="var(--color-ash-500)" dx={4}>of {CAR_COUNT}</tspan>
          </text>
          <text x={LX} y={48} fontSize={8} fill="var(--color-ash-500)">Verified automatically</text>
          <text x={LX + LOT_W} y={34} fontSize={27} className="figure" textAnchor="end">0</text>
          <text x={LX + LOT_W} y={48} fontSize={8} fill="var(--color-ash-500)" textAnchor="end">People on site</text>
          <line x1={LX} x2={LX + LOT_W} y1={56} y2={56} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
        </g>

        <g transform={`translate(${LX} ${LY})`}>
          {/* geofence, drawn first */}
          <rect x={-FENCE} y={-FENCE} width={LOT_W + 2 * FENCE} height={LOT_H + 2 * FENCE} fill="var(--color-brand-soft)" opacity={fence} />
          <path
            d={`M${-FENCE} ${-FENCE} H${LOT_W + FENCE} V${LOT_H + FENCE} H${-FENCE} Z`}
            fill="none" stroke="var(--color-brand-deep)" strokeWidth={0.7}
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - fence}
          />
          <text x={-FENCE} y={-FENCE - 4} fontSize={7.5} fill="var(--color-brand-deep)" opacity={fence}>Geofence</text>

          <Kerb />
          <LotLines />

          {STALLS.map((d, i) => {
            if (d.kind === "empty") return null;
            if (d.kind === "sold") {
              if (flag <= 0) return null;
              return (
                <g key={i} opacity={flag}>
                  <rect x={d.x + 3} y={d.y + 5} width={SW - 6} height={SH - 10} fill="var(--color-high-soft)" stroke="var(--color-high)" strokeDasharray="2 2" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  <text x={d.cx} y={d.down ? d.y + SH + 10 : d.y - 5} fontSize={7} textAnchor="middle" fill="var(--color-high)">Sale seen</text>
                </g>
              );
            }
            const t = REPORT_AT[i];
            const on = d.connected ? span(p, t, t + 0.012) : 0;
            return (
              <g key={i}>
                <CarTop x={d.x} y={d.y} down={d.down} fill="var(--color-ash-300)" glass="rgba(15,30,51,0.18)" />
                {on > 0 && (
                  <g opacity={on}>
                    <CarTop x={d.x} y={d.y} down={d.down} fill="var(--color-lime)" glass="rgba(15,30,51,0.5)" />
                  </g>
                )}
              </g>
            );
          })}

          {/* pulses: one ring per car as it reports */}
          {STALLS.map((d, i) => {
            if (!d.connected) return null;
            const k = span(p, REPORT_AT[i], REPORT_AT[i] + 0.09);
            if (k <= 0 || k >= 1) return null;
            return <circle key={i} cx={d.cx} cy={d.cy} r={5 + 26 * ease(k)} fill="none" stroke="var(--color-go)" strokeOpacity={0.75 * (1 - k)} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />;
          })}

          {/* a slow idle ping on a few cars once the wave has passed */}
          {p > 0.68 && IDLE.map((i, k) => (
            <circle
              key={i} cx={STALLS[i].cx} cy={STALLS[i].cy} r={9} fill="none" stroke="var(--color-go)" strokeOpacity={0.5} strokeWidth={1}
              className="hidden motion-safe:block motion-safe:animate-ping" vectorEffect="non-scaling-stroke"
              style={{ transformBox: "fill-box", transformOrigin: "center", animationDuration: "3.2s", animationDelay: `${k * 0.7}s` }}
            />
          ))}

          {/* sale feeds join at the lot edge */}
          {FEEDS.map((f) => {
            const cx = f.x + f.w / 2;
            return (
              <g key={f.label} opacity={feeds}>
                <line x1={cx} x2={cx} y1={badgeY} y2={fenceY} stroke="var(--color-brand-deep)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                {travel > 0 && travel < 1 && <circle cx={cx} cy={badgeY - (badgeY - fenceY) * travel} r={1.8} fill="var(--color-brand-deep)" />}
                <rect x={f.x} y={badgeY} width={f.w} height={13} fill="var(--color-paper)" stroke="var(--color-brand-deep)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text x={cx} y={badgeY + 9.2} fontSize={7.5} textAnchor="middle" fill="var(--color-brand-deep)">{f.label}</text>
              </g>
            );
          })}
          <text x={LOT_W + FENCE} y={badgeY + 9.2} fontSize={7.5} textAnchor="end" fill="var(--color-ash-500)" opacity={feeds}>Sales watched too</text>
        </g>
      </svg>
    </div>
  );
}
