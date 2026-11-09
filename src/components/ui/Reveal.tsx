"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Marks itself data-shown once it scrolls into view, so `.reveal-*` children land. */
export function Reveal({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} aria-label={label} data-shown={shown ? "" : undefined} className={`reveal ${className}`}>
      {children}
    </section>
  );
}
