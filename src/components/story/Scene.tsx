"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A chapter that plays itself: when the section scrolls into view, its text
 * is revealed and `p` runs 0 → 1 over `duration` ms, driving the visual.
 * It plays once; a replay control appears at the end.
 * With reduced motion, everything shows at once and p is pinned to 1.
 */

export function useAutoPlay<T extends HTMLElement>(duration: number) {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  const [shown, setShown] = useState(false);
  const [run, setRun] = useState(0); // bumps to replay
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => { setShown(true); setP(1); });
      return () => cancelAnimationFrame(id);
    }
    let raf = 0, t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const v = Math.min(1, (now - t0) / duration);
      setP(v);
      raf = v < 1 ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setShown(true);
      setP(0);
      // let the text land first, then the picture plays
      raf = requestAnimationFrame(() => { t0 = performance.now() + 450; raf = requestAnimationFrame(tick); });
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [duration, run]);
  return { ref, p, shown, replay: () => setRun((n) => n + 1) };
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
  duration = 7500,
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
  /** How long the visual takes to play, ms. */
  duration?: number;
}) {
  const { ref, p, shown, replay } = useAutoPlay<HTMLElement>(duration);
  const dark = tone === "dark";
  const step = steps ? Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999)) : -1;
  return (
    <section id={id} ref={ref} data-shown={shown ? "" : undefined} className={`reveal relative border-t border-ink ${dark ? "bg-ink text-paper" : "bg-paper text-ink"}`}>
      <div className="mx-auto grid h-[calc(100svh-4rem)] min-h-[34rem] max-w-[1600px] grid-rows-[auto_1fr] gap-4 px-4 pt-6 pb-6 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-1 lg:gap-12 lg:py-12">
        <div className="relative z-10 flex flex-col lg:justify-between">
          <p className={`reveal-fade flex items-baseline gap-3 text-sm ${dark ? "text-paper/60" : "text-ash-700"}`}>
            <span className="figure text-base">{String(index).padStart(2, "0")}</span>
            <span>{kicker}</span>
          </p>
          <div className="mt-4 lg:mt-0">
            <h2 className="display-wide text-[clamp(2.1rem,4.4vw,4.6rem)] [overflow-y:clip]"><span className="reveal-rise block">{title}</span></h2>
            <div className={`reveal-fade [--d:200ms] mt-4 max-w-[46ch] text-[0.95rem] leading-relaxed md:text-base lg:mt-6 ${dark ? "text-paper/75" : "text-ash-700"}`}>{body}</div>
            {steps && (
              <ol className="reveal-fade [--d:320ms] mt-5 hidden max-w-[46ch] lg:block" aria-label="Steps">
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
        <div className="reveal-fade [--d:120ms] relative min-h-0">
          {visual(p)}
          {p >= 1 && shown && (
            <button type="button" onClick={replay} className={`absolute top-0 right-0 z-10 text-sm underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none motion-reduce:hidden ${dark ? "text-paper/70" : "text-ash-700"}`}>
              Replay
            </button>
          )}
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
