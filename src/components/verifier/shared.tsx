import type { Car, Dealer, SpotCheck, VisitCarResult } from "@/lib/types";

export type Job = { visit: SpotCheck; dealer: Dealer; cars: Car[] };

export type CarState = "todo" | "found" | "missing" | "unconfirmed";

export const confirmed = (r?: VisitCarResult) => r?.status === "found" && (!r.photo || r.photo.verified);

export function carState(r?: VisitCarResult): CarState {
  if (!r) return "todo";
  if (r.status === "missing") return "missing";
  return confirmed(r) ? "found" : "unconfirmed";
}

/** Paint colour as a swatch, so a car can be spotted from across the lot. */
const PAINT: Record<string, string> = {
  black: "#111",
  white: "#fff",
  silver: "#c9c9cf",
  "dark grey": "#4a4a4f",
  grey: "#8a8a90",
  blue: "#2f5bd3",
  red: "#d6322a",
  green: "#2f7a4a",
};

export function Swatch({ color }: { color: string }) {
  const fill = PAINT[color.toLowerCase()];
  if (!fill) return null;
  return <span aria-hidden className="inline-block size-3 shrink-0 rounded-full border border-line" style={{ background: fill }} />;
}

/** Licence plate as it looks on the car: the thing a verifier scans for first. */
export function Plate({ plate, size = "md" }: { plate: string; size?: "md" | "lg" }) {
  return (
    <span className={`inline-block shrink-0 border border-line bg-paper font-mono font-medium whitespace-nowrap ${size === "lg" ? "px-2.5 py-1 text-xl tracking-[0.12em]" : "px-1.5 py-0.5 text-sm tracking-wider"}`}>
      {plate}
    </span>
  );
}

/** Small square that shows where a car stands. Used in the list, the header bar and the summary. */
export function StateMark({ state, className = "size-9" }: { state: CarState; className?: string }) {
  const tone = state === "found" ? "bg-lime" : state === "missing" ? "bg-ink text-paper" : state === "unconfirmed" ? "bg-high-soft" : "bg-paper";
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center border border-line ${tone} ${className}`}>
      {state === "found" && <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" /></svg>}
      {state === "missing" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" /></svg>}
      {state === "unconfirmed" && <span className="font-display text-lg leading-none font-semibold">!</span>}
    </span>
  );
}

export const STATE_LABEL: Record<CarState, string> = { todo: "Check", found: "Found", missing: "Not here", unconfirmed: "Retake" };
