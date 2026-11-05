import type { ReactNode } from "react";

type Tone = "outline" | "ink" | "brand" | "lime" | "high" | "medium" | "low" | "muted";
const TONES: Record<Tone, string> = {
  outline: "border-ink text-ink bg-transparent",
  ink: "border-ink bg-ink text-paper",
  brand: "border-ink bg-brand text-ink",
  lime: "border-ink bg-lime text-ink",
  high: "border-high bg-high text-ink",
  medium: "border-ink bg-medium text-ink",
  low: "border-ink bg-low-soft text-ink",
  muted: "border-ash-300 text-ash-700 bg-paper",
};

/** Small bordered uppercase mono label. */
export function Tag({ children, tone = "outline", className = "" }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-1 border px-1.5 py-0.5 whitespace-nowrap tag-text ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
