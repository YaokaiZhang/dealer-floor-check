import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "brand" | "ghost" | "danger";
const V: Record<Variant, string> = {
  primary: "bg-ink text-paper border-ink hover:bg-ink/85",
  secondary: "bg-paper text-ink border-ink hover:bg-ink hover:text-paper",
  brand: "bg-brand text-ink border-brand hover:border-ink",
  ghost: "bg-transparent text-ink border-transparent hover:border-ink",
  danger: "bg-high text-paper border-high hover:brightness-95",
};
const base =
  "group/button inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-sm font-medium transition-colors duration-200 active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40";

export function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="transition-transform duration-150 group-hover/button:translate-x-[1px] group-hover/button:-translate-y-[1px]">
      <path d="M3 11L11 3M11 3H4.5M11 3V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function Button({ variant = "primary", arrow, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; arrow?: boolean; children: ReactNode }) {
  return (
    <button className={`${base} ${V[variant]} ${className}`} {...rest}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", arrow, className = "", children }: { href: string; variant?: Variant; arrow?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${base} ${V[variant]} ${className}`}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}
