"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Alert, AlertSource, EscalationStep, Severity } from "@/lib/types";
import { Tag } from "@/components/ui/Tag";

/** Current time, re-read every `ms` so "time ago" labels and auto-verification stay live. */
export function useNow(ms = 5000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Measured width of an element (for charts rendered at real pixel size so text stays legible). */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export const SOURCE_LABEL: Record<AlertSource, string> = {
  connected_car: "Connected car",
  marketplace: "Marketplace",
  registry: "Registry",
  check_in: "Check-in",
};

export const SEV_BAR: Record<Severity, string> = { high: "bg-high", medium: "bg-medium", low: "bg-low" };
export const SEV_SOFT: Record<Severity, string> = { high: "bg-high-soft", medium: "bg-medium-soft", low: "bg-low-soft" };

export function SeverityTag({ severity }: { severity: Severity }) {
  return <Tag tone={severity}>{severity}</Tag>;
}

export function SourceTag({ source }: { source: AlertSource }) {
  return (
    <Tag tone="outline">
      <SourceIcon source={source} />
      {SOURCE_LABEL[source]}
    </Tag>
  );
}

function SourceIcon({ source }: { source: AlertSource }) {
  const p = { width: 10, height: 10, viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: 1.3, "aria-hidden": true } as const;
  switch (source) {
    case "connected_car":
      return <svg {...p}><path d="M1 6.5h8M2 6.5 3 3.5h4l1 3M2.5 8.5v-1M7.5 8.5v-1" /></svg>;
    case "marketplace":
      return <svg {...p}><path d="M1.5 4.5 5 1h3.5v3.5L5 8z" /><circle cx="6.8" cy="2.8" r=".6" /></svg>;
    case "registry":
      return <svg {...p}><rect x="1.5" y="1" width="7" height="8" /><path d="M3 3.5h4M3 5.5h4M3 7.5h2" /></svg>;
    case "check_in":
      return <svg {...p}><rect x="1" y="2.5" width="8" height="6" /><circle cx="5" cy="5.5" r="1.6" /><path d="M3.5 2.5 4 1h2l.5 1.5" /></svg>;
  }
}

export const isOpen = (a: Alert) => a.status === "open" || a.status === "investigating";

export const STEP_ORDER: EscalationStep[] = ["signal", "targeted_check_in", "gig_verifier", "auditor"];

export function StatusTag({ alert }: { alert: Alert }) {
  if (alert.status === "resolved_ok") return <Tag tone="lime">Cleared</Tag>;
  if (alert.status === "confirmed_fraud") return <Tag tone="ink">Sold out of trust</Tag>;
  if (alert.verifier && alert.verifier.status !== "reported")
    return <Tag tone="brand"><span className="size-1.5 animate-pulse-dot bg-ink" />{({ offered: "Verifier job posted", en_route: "Verifier en route", on_site: "Verifier on site" } as const)[alert.verifier.status]}</Tag>;
  if (alert.verifier?.status === "reported") return <Tag tone={alert.verifier.found ? "lime" : "high"}>Verifier: {alert.verifier.found ? "found" : "not found"}</Tag>;
  if (alert.step === "auditor") return <Tag tone="ink">Auditor assigned</Tag>;
  if (alert.step === "targeted_check_in") return <Tag tone="muted">Check-in sent</Tag>;
  return <Tag tone="muted">Open</Tag>;
}

/** Small "i" button that reveals an explainer on hover, focus or tap. */
export function Explainer({ label, children, align = "left" }: { label: string; children: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1 border border-ink bg-paper px-1.5 py-0.5 tag-text hover:bg-brand"
      >
        <span className="font-semibold">i</span> {label}
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-full z-50 mt-2 block w-[min(22rem,80vw)] border border-ink bg-paper p-4 text-left text-sm normal-case shadow-lift ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children}
        </span>
      )}
    </span>
  );
}

export function Check({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span className={`inline-flex size-4 items-center justify-center border text-[10px] leading-none ${ok ? "border-ink bg-lime" : "border-ash-300 text-ash-500"}`} aria-label={label ?? (ok ? "yes" : "no")}>
      {ok ? "✓" : "–"}
    </span>
  );
}
