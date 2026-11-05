"use client";
import { useEffect, useState } from "react";
import { SCAN_MS, scanDelay, type Stall } from "./Lot";

/** Counts verified cars as the hero scan paints them, so the number and the beam move together. */
export function ScanCount({ stalls, cols, className = "" }: { stalls: Stall[]; cols: number; className?: string }) {
  const times = stalls
    .map((x, i) => (x === "connected" || x === "photo" || x === "visit" ? scanDelay(((i % cols) + 0.5) / cols) : null))
    .filter((t): t is number => t !== null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setN(times.length));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let id = 0;
    const step = (t: number) => {
      const elapsed = t - start;
      setN(times.filter((d) => d <= elapsed).length);
      if (elapsed < SCAN_MS + 100) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
    // The lot is static for the page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <span className={`tabular-nums ${className}`}>{n}</span>;
}
