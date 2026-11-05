/**
 * Aerial view of a dealer lot: the visual motif of the product ("the floor").
 * Each stall holds a car seen from above, coloured by how we know it is there.
 */
export type Stall = "connected" | "photo" | "visit" | "unknown" | "missing" | "empty";

const FILL: Record<Stall, string> = {
  connected: "var(--color-lime)",
  photo: "var(--color-brand)",
  visit: "var(--color-paper)",
  unknown: "#3a3a3a",
  missing: "var(--color-high)",
  empty: "transparent",
};

const W = 22; // stall width
const H = 40; // stall depth
const AISLE = 18;

function Car({ x, y, state, flip, delay }: { x: number; y: number; state: Stall; flip: boolean; delay?: number }) {
  if (state === "empty") return null;
  const dark = state === "unknown";
  const glass = dark ? "#555" : "rgba(0,0,0,0.78)";
  // Car body 14x28 centred in the stall; windscreen faces the aisle.
  const bx = x + 4, by = y + 6;
  return (
    <g className={delay !== undefined ? "lot-car" : undefined} style={delay !== undefined ? { animationDelay: `${delay}ms` } : undefined}>
      <rect x={bx} y={by} width={14} height={28} rx={3.5} fill={FILL[state]} stroke={state === "visit" ? "var(--color-ink)" : "none"} strokeWidth={1} />
      <rect x={bx + 2} y={flip ? by + 18 : by + 5} width={10} height={5} rx={1.5} fill={glass} />
      <rect x={bx + 2.5} y={flip ? by + 5 : by + 20} width={9} height={3} rx={1} fill={glass} opacity={0.6} />
      {state === "missing" && <path d={`M${bx + 3} ${by + 10} l8 8 M${bx + 11} ${by + 10} l-8 8`} stroke="var(--color-ink)" strokeWidth={1.6} />}
    </g>
  );
}

/**
 * Renders rows of stalls in pairs facing a shared aisle.
 * `stalls` is read row by row; `cols` stalls per row.
 */
export function Lot({
  stalls,
  cols,
  animate,
  className = "",
  title,
}: {
  stalls: Stall[];
  cols: number;
  animate?: boolean;
  className?: string;
  title?: string;
}) {
  const rows = Math.ceil(stalls.length / cols);
  const rowY = (r: number) => r * H + Math.floor(r / 2) * AISLE + (r % 2 ? 0 : 0);
  const width = cols * W + 8;
  const height = rowY(rows - 1) + H + 8;
  return (
    <svg viewBox={`-4 -4 ${width} ${height}`} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {Array.from({ length: rows }, (_, r) => {
        const y = rowY(r);
        const top = r % 2 === 0; // top row of a pair faces down toward the aisle
        return (
          <g key={r}>
            {/* stall lines */}
            {Array.from({ length: cols + 1 }, (_, c) => (
              <line key={c} x1={c * W} x2={c * W} y1={top ? y + 2 : y} y2={top ? y + H : y + H - 2} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
            ))}
            <line x1={0} x2={cols * W} y1={top ? y + 2 : y + H - 2} y2={top ? y + 2 : y + H - 2} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
            {Array.from({ length: cols }, (_, c) => {
              const i = r * cols + c;
              if (i >= stalls.length) return null;
              return <Car key={c} x={c * W} y={y} state={stalls[i]} flip={!top} delay={animate ? 200 + (c * 37 + r * 90) % 900 : undefined} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Deterministic pseudo-random lot so server and client render the same picture. */
export function demoLot(n: number, mix: Partial<Record<Stall, number>>, seed = 7): Stall[] {
  let x = seed;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const out: Stall[] = [];
  const entries = Object.entries(mix) as [Stall, number][];
  for (let i = 0; i < n; i++) {
    let r = rnd();
    let pick: Stall = "unknown";
    for (const [k, p] of entries) {
      if (r < p) { pick = k; break; }
      r -= p;
    }
    out.push(pick);
  }
  return out;
}
