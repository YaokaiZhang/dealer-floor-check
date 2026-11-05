import Link from "next/link";

/** Fictional lender wordmark: Aurora Dealer Finance. */
export function Wordmark({ href = "/", sub }: { href?: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Aurora Dealer Finance, home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect width="26" height="26" fill="#0f1e33" />
        <path d="M4 19 C 9 7, 17 7, 22 19" stroke="#7d94b6" strokeWidth="2.4" fill="none" />
        <path d="M8 19 C 11 12, 15 12, 18 19" stroke="#b6e0cb" strokeWidth="2.4" fill="none" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[1.05rem] font-semibold uppercase tracking-tight">Aurora</span>
        <span className="block tag-text text-ash-700">{sub ?? "Dealer Finance"}</span>
      </span>
    </Link>
  );
}
