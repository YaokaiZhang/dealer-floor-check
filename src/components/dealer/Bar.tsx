import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Arrow } from "@/components/ui/Button";

type Tone = "ink" | "paper" | "brand";
const TONE: Record<Tone, string> = {
  ink: "bg-ink text-paper hover:bg-ink/85 focus-visible:outline-paper",
  paper: "bg-paper text-ink hover:bg-ink hover:text-paper",
  brand: "bg-brand text-ink hover:bg-ink hover:text-paper",
};

/** Full-width action row, like the role rows on the home page: big label left, arrow right. */
export function Bar({ tone = "ink", arrow = true, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; arrow?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`group/button flex min-h-16 w-full border-t border-ink items-center justify-between gap-4 px-4 py-4 text-left display-md transition-colors duration-200 focus-visible:-outline-offset-4 disabled:cursor-not-allowed disabled:bg-ash-100 disabled:text-ash-500 ${TONE[tone]} ${className}`}
      {...rest}
    >
      <span className="min-w-0">{children}</span>
      {arrow && <Arrow />}
    </button>
  );
}

/** Quiet secondary action under a Bar. */
export function TextAction({ className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={`min-h-12 w-full px-4 text-sm font-medium text-ash-700 underline underline-offset-4 hover:text-ink ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Lime check square used for verified / booked states. */
export function Check({ size = 48, draw }: { size?: number; draw?: boolean }) {
  const icon = Math.round(size / 2);
  return (
    <span className={`flex shrink-0 items-center justify-center bg-ink text-lime ${draw ? "animate-pop" : ""}`} style={{ width: size, height: size }} aria-hidden>
      <svg width={icon} height={icon} viewBox="0 0 20 20" fill="none">
        <path d="M4 10.5l4 4 8-9" {...(draw ? { pathLength: 1, strokeDasharray: "1", className: "animate-draw" } : {})} stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
      </svg>
    </span>
  );
}
