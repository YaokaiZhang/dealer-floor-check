import type { HTMLAttributes, ReactNode } from "react";

/** Hairline-bordered panel with the soft drop shadow. */
export function Card({ children, className = "", interactive, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; interactive?: boolean }) {
  return (
    <div
      className={`relative border border-line bg-paper shadow-card ${interactive ? "transition-transform duration-300 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Small uppercase section label, e.g. "Our impact". */
export function SectionTag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`tag-text text-brand-deep ${className}`}>{children}</p>;
}
