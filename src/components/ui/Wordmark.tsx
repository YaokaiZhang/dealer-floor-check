import Link from "next/link";

/** The Kerb logotype, mid-scan: letters behind the beam are ink, letters ahead of it still grey. */
export function Logotype({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex items-stretch leading-none font-semibold tracking-[-0.04em] uppercase [font-stretch:125%] ${className}`}>
      <span>Ke</span>
      <span className="mx-[0.06em] -my-[0.12em] w-[2px] bg-go transition-transform duration-500 ease-out group-hover:scale-y-125" />
      <span className="text-ash-300 transition-colors duration-500 group-hover:text-ink">rb</span>
    </span>
  );
}

/** Fictional lender wordmark: Kerb Finance. */
export function Wordmark({ href = "/", sub }: { href?: string; sub?: string }) {
  return (
    <Link href={href} className="group flex items-baseline gap-3" aria-label="Kerb Finance, home">
      <Logotype className="text-[1.45rem]" />
      <span className="hidden text-xs text-ash-700 sm:inline">{sub ?? "Floor Check"}</span>
    </Link>
  );
}
