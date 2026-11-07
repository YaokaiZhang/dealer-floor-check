/**
 * The dealer lot shared by chapters 1 (Walk) and 2 (Signals), so the two read
 * as the same place: four rows of stalls facing two aisles, seen from above.
 * Echoes `ui/Lot.tsx` (same stall and car geometry).
 */

export const SW = 22; // stall width
export const SH = 40; // stall depth
export const AISLE = 36;
export const COLS = 13;
export const ROWS = 4;
export const LOT_W = COLS * SW;
export const LOT_H = ROWS * SH + 2 * AISLE;

/** Shared frame: the lot sits under a readout band and above a footer band. */
export const VB_W = 330;
export const VB_H = 362;
export const LX = (VB_W - LOT_W) / 2;
export const LY = 86;

/** Top edge of row r: rows 0|1 face aisle 0, rows 2|3 face aisle 1 (rows 1 and 2 are back to back). */
export const rowY = (r: number) => r * SH + Math.floor((r + 1) / 2) * AISLE;
/** Centre line of aisle a (0 or 1). */
export const aisleY = (a: number) => SH + a * (2 * SH + AISLE) + AISLE / 2;

export type StallKind = "car" | "empty" | "sold";
export type StallInfo = {
  r: number;
  c: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  /** Faces down when the aisle is below it. */
  down: boolean;
  kind: StallKind;
  /** The car reports its position (chapter 2). */
  connected: boolean;
};

/** Sold last week: still on the clipboard, gone from the lot. */
const SOLD = new Set(["0-8", "3-10"]);
/** Simply empty stalls. */
const EMPTY = new Set(["1-2", "2-11"]);
export const CONNECTED_COUNT = 31;

function build(): StallInfo[] {
  const out: StallInfo[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r}-${c}`;
      const x = c * SW, y = rowY(r);
      out.push({
        r, c, x, y, cx: x + SW / 2, cy: y + SH / 2, down: r % 2 === 0,
        kind: SOLD.has(key) ? "sold" : EMPTY.has(key) ? "empty" : "car",
        connected: false,
      });
    }
  }
  // Seeded shuffle picks which cars are connected (same on server and client).
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const cars = out.filter((d) => d.kind === "car");
  for (let i = cars.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cars[i], cars[j]] = [cars[j], cars[i]];
  }
  cars.slice(0, CONNECTED_COUNT).forEach((d) => (d.connected = true));
  return out;
}

export const STALLS = build();
export const CAR_COUNT = STALLS.filter((d) => d.kind === "car").length;

/** Stall lines: separators plus the back line of each row. */
export function LotLines() {
  return (
    <g stroke="var(--color-ash-300)" strokeWidth={1} vectorEffect="non-scaling-stroke">
      {Array.from({ length: ROWS }, (_, r) => {
        const y = rowY(r);
        const down = r % 2 === 0;
        const back = down ? y + 1 : y + SH - 1;
        return (
          <g key={r}>
            {Array.from({ length: COLS + 1 }, (_, c) => (
              <line key={c} x1={c * SW} x2={c * SW} y1={down ? y + 1 : y} y2={down ? y + SH : y + SH - 1} vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={0} x2={LOT_W} y1={back} y2={back} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </g>
  );
}

/** Kerb around the lot, open on the left at both aisles (the way in and out). */
export function Kerb() {
  const m = 12;
  const l = -m, t = -m, rgt = LOT_W + m, b = LOT_H + m;
  const g0a = aisleY(0) - 12, g0b = aisleY(0) + 12, g1a = aisleY(1) - 12, g1b = aisleY(1) + 12;
  const d = `M${l} ${g0a} V${t} H${rgt} V${b} H${l} V${g1b} M${l} ${g1a} V${g0b}`;
  return <path d={d} fill="none" stroke="var(--color-ash-500)" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />;
}

/** A car seen from above, windscreen toward the aisle. */
export function CarTop({ x, y, down, fill, outline, glass = "rgba(15,30,51,0.55)" }: { x: number; y: number; down: boolean; fill: string; outline?: string; glass?: string }) {
  const bx = x + 4, by = y + 6;
  return (
    <g>
      <rect x={bx} y={by} width={14} height={28} rx={3.5} fill={fill} stroke={outline ?? "none"} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={bx + 2} y={down ? by + 18 : by + 5} width={10} height={5} rx={1.5} fill={glass} />
      <rect x={bx + 2.5} y={down ? by + 5 : by + 20} width={9} height={3} rx={1} fill={glass} opacity={0.6} />
    </g>
  );
}

export const FONT = { fontFamily: "var(--font-sans)" } as const;
