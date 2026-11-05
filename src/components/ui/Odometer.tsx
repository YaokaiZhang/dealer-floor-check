"use client";
import { useEffect, useState } from "react";

const DIGITS = "0123456789".split("");

/**
 * A figure that rolls like a car's odometer: on first paint it counts up from
 * zero, and whenever live data changes the affected digits roll to the new value.
 * Non-digit characters (€, %, −, k, .) are drawn as-is.
 */
export function Odometer({ value, ms = 900, className = "" }: { value: string | number; ms?: number; className?: string }) {
  const text = String(value);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const chars = text.split("");
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex items-baseline">
        {chars.map((c, i) => {
          // Key from the right so units stay put when the number gains a digit.
          const place = chars.length - i;
          if (!/\d/.test(c)) return <span key={`s${place}${c}`}>{c}</span>;
          const d = ready ? Number(c) : 0;
          return (
            <span key={`d${place}`} className="odo">
              <span className="odo-strip" style={{ transform: `translateY(-${d}em)`, ["--odo-ms" as string]: `${ms + place * 60}ms` }}>
                {DIGITS.map((n) => <span key={n}>{n}</span>)}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
