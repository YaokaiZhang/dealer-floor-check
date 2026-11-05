"use client";
import { useEffect, useRef, useState } from "react";
import { ScanCar } from "@/components/ui/ScanCar";
import { Logotype } from "@/components/ui/Wordmark";

const KEY = "kerb:entered";

export const INTRO_CALLOUTS = [
  { x: -1, y: 0.3, z: 0, value: "KLM-482" },
  { x: 0.2, y: 0.5, z: -0.22, value: "48,210 km" },
  { x: 0.46, y: 0.47, z: 0.26, value: "VIN …014275" },
];

/** Full-screen cover: a car being scanned. Enter lifts it away for the rest of the session. */
export function Intro() {
  const [gone, setGone] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const enter = () => setGone(true);

  useEffect(() => {
    if (!gone) return;
    try { sessionStorage.setItem(KEY, "1"); } catch {}
    const t = setTimeout(() => { document.documentElement.dataset.entered = ""; }, 1000);
    return () => clearTimeout(t);
  }, [gone]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let y0: number | null = null;
    const onWheel = (e: WheelEvent) => { if (e.deltaY > 24) enter(); };
    const onStart = (e: TouchEvent) => { y0 = e.touches[0].clientY; };
    const onMove = (e: TouchEvent) => { if (y0 != null && y0 - e.touches[0].clientY > 50) enter(); };
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    return () => { el.removeEventListener("wheel", onWheel); el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove); };
  }, []);

  return (
    <section
      ref={ref}
      data-gone={gone ? "" : undefined}
      aria-hidden={gone || undefined}
      className="intro fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-paper p-5 md:p-10"
    >
      <ScanCar callouts={INTRO_CALLOUTS} scale={0.34} className="absolute inset-x-0 top-[44%] h-[36%] w-full md:top-[10%] md:left-[34%] md:h-[80%] md:w-[66%]" />

      <div className="relative">
        <p className="flex items-baseline gap-3"><Logotype className="text-[1.45rem]" /><span className="sr-only">Kerb</span><span className="text-xs text-ash-700">Floor Check</span></p>
        <p className="display-wide mt-[8vh] max-w-[9ch] text-[clamp(2.3rem,6.2vw,6.25rem)] md:mt-[10vh]">Every car on the floor, accounted for.</p>
      </div>

      <div className="relative flex justify-end">
        <button type="button" onClick={enter} className="group text-right transition-opacity hover:opacity-60">
          <span className="display-wide block text-[clamp(3rem,8vw,8.5rem)] leading-[0.8]">Enter —</span>
        </button>
      </div>
    </section>
  );
}
