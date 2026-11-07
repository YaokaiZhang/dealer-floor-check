"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A scroll-told chapter: the section is taller than the screen and its stage
 * sticks while you scroll through it. `p` runs 0 → 1 across that scroll and
 * drives the visual, so the picture moves only when the reader does.
 * With reduced motion, p is pinned to 1 (the finished picture).
 */
/** Height of the sticky top bar the stage sits under. */
const BAR = 64;

export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setP(1));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const run = r.height - (window.innerHeight - BAR);
      const v = run > 0 ? (BAR - r.top) / run : r.top < BAR ? 1 : 0;
      setP(Math.min(1, Math.max(0, v)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  return { ref, p };
}

/** Maps p inside [a, b] to 0 → 1, clamped. */
export const span = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
/** Smoothstep easing for the mapped value. */
export const ease = (t: number) => t * t * (3 - 2 * t);

export function Scene({
  id,
  index,
  kicker,
  title,
  body,
  steps,
  visual,
  tone = "light",
  length = 260,
}: {
  id: string;
  /** Chapter number, shown small. Chapters are a sequence, so the number means something. */
  index: number;
  /** One short line naming the part of the case this answers. */
  kicker: string;
  title: ReactNode;
  body: ReactNode;
  /** Optional captions that take turns as p advances (equal shares of the scroll). */
  steps?: string[];
  visual: (p: number) => ReactNode;
  tone?: "light" | "dark";
  /** Section height in vh; more means slower. */
  length?: number;
}) {
  const { ref, p } = useScrollProgress<HTMLElement>();
  const dark = tone === "dark";
  const step = steps ? Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999)) : -1;
  return (
    <section id={id} ref={ref} style={{ height: `${length}svh` }} className={`relative border-t border-ink ${dark ? "bg-ink text-paper" : "bg-paper text-ink"}`}>
      <div className="sticky top-16 mx-auto grid h-[calc(100svh-4rem)] max-w-[1600px] grid-rows-[auto_1fr] gap-4 px-4 pt-6 pb-6 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-1 lg:gap-12 lg:py-12">
        <div className="relative z-10 flex flex-col lg:justify-between">
          <p className={`flex items-baseline gap-3 text-sm ${dark ? "text-paper/60" : "text-ash-700"}`}>
            <span className="figure text-base">{String(index).padStart(2, "0")}</span>
            <span>{kicker}</span>
          </p>
          <div className="mt-4 lg:mt-0">
            <h2 className="display-wide text-[clamp(2.1rem,5vw,4.6rem)]">{title}</h2>
            <div className={`mt-4 max-w-[46ch] text-[0.95rem] leading-relaxed md:text-base lg:mt-6 ${dark ? "text-paper/75" : "text-ash-700"}`}>{body}</div>
            {steps && (
              <ol className="mt-5 hidden max-w-[46ch] lg:block" aria-label="Steps">
                {steps.map((s, i) => (
                  <li key={s} className={`flex gap-3 border-t py-2.5 text-sm transition-colors duration-300 ${dark ? "border-paper/15" : "border-line"} ${i === step ? (dark ? "text-paper" : "text-ink") : dark ? "text-paper/35" : "text-ash-500"}`}>
                    <span className="figure w-5 shrink-0">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
        <div className="relative min-h-0">
          {visual(p)}
          {steps && (
            <p aria-hidden className={`absolute inset-x-0 bottom-0 text-sm lg:hidden ${dark ? "text-paper/80" : "text-ink"}`}>
              <span className="figure mr-2">{step + 1}</span>{steps[step]}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
