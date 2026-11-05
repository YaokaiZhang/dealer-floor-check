import type { HTMLAttributes, ReactNode } from "react";

/** Hairline-bordered panel with the soft drop shadow. */
export function Card({ children, className = "", interactive, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; interactive?: boolean }) {
  return (
    <div
      className={`relative border border-line bg-paper shadow-card ${interactive ? "transition-colors duration-200 hover:border-ink" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Small uppercase section label, e.g. "Our impact". */
export function SectionTag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-ash-700 ${className}`}>{children}</p>;
}
