"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./ui/Wordmark";

const ROLES = [
  { href: "/dealer", label: "Dealer" },
  { href: "/bank", label: "Bank" },
  { href: "/demo", label: "Demo control" },
];

/** No auth in the prototype: switch roles from the top bar. */
export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-ink bg-paper/90 backdrop-blur-sm">
      <div className={`mx-auto flex items-center justify-between gap-4 px-4 ${compact ? "h-14 max-w-xl" : "h-16 max-w-[1400px] md:px-8"}`}>
        <Wordmark />
        <nav aria-label="Role" className="flex items-center border border-ink">
          {ROLES.map((r) => {
            const active = path?.startsWith(r.href);
            return (
              <Link
                key={r.href}
                href={r.href}
                aria-current={active ? "page" : undefined}
                className={`px-2.5 py-1.5 tag-text transition-colors sm:px-3 ${active ? "bg-ink text-paper" : "hover:bg-brand"} ${r.href === "/demo" && compact ? "hidden sm:block" : ""}`}
              >
                {r.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
