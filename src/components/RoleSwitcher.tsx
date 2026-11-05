"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./ui/Wordmark";
import { useConnected, useHydrated } from "@/lib/store";

const ROLES = [
  { href: "/dealer", label: "Dealer" },
  { href: "/verifier", label: "Verifier" },
  { href: "/bank", label: "Bank" },
  { href: "/demo", label: "Demo control", short: "Demo" },
];

/** No auth in the prototype: switch roles from the top bar. */
export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const path = usePathname();
  const live = useConnected();
  const hydrated = useHydrated();
  return (
    <header className="sticky top-0 z-40 border-b border-ink bg-paper/90 backdrop-blur-sm">
      <div className={`mx-auto flex items-center justify-between gap-3 px-4 ${compact ? "h-14 max-w-md" : "h-16 max-w-[1600px] md:px-8"}`}>
        <Wordmark />
        <nav aria-label="Role" className="flex items-center">
          {ROLES.map((r) => {
            const active = path?.startsWith(r.href);
            return (
              <Link
                key={r.href}
                href={r.href}
                aria-current={active ? "page" : undefined}
                className={`px-2 py-1.5 text-sm font-medium transition-colors sm:px-3 ${active ? "bg-ink text-paper" : "hover:bg-mist"} ${r.href === "/demo" && compact ? "hidden sm:block" : ""}`}
              >
                {r.short ? <><span className="sm:hidden">{r.short}</span><span className="hidden sm:inline">{r.label}</span></> : r.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {hydrated && !live && (
        <p role="status" className="border-t border-ink bg-medium-soft px-4 py-1 text-center tag-text">Reconnecting to the server…</p>
      )}
    </header>
  );
}
