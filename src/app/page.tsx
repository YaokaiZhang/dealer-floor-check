import Link from "next/link";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Intro } from "@/components/home/Intro";
import { HeroLot } from "@/components/home/HeroLot";
import { Story } from "@/components/story/Story";

/** Skip the cover for the rest of the session once someone has entered. Runs before paint. */
const SKIP_INTRO = `try{if(sessionStorage.getItem("curb:entered"))document.documentElement.dataset.entered=""}catch(e){}`;

const ROLES = [
  { href: "/bank", title: "Bank", kind: "Desktop" },
  { href: "/dealer", title: "Dealer", kind: "Phone" },
  { href: "/verifier", title: "Verifier", kind: "Phone" },
  { href: "/demo", title: "Demo", kind: "Stage" },
];

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP_INTRO }} />
      <Intro />
      <RoleSwitcher />
      <main className="overflow-x-clip">
        <header className="relative">
          <HeroLot className="absolute inset-0" />
          <div className="relative mx-auto flex min-h-[calc(92svh-4rem)] max-w-[1600px] flex-col justify-end px-4 pt-10 pb-12 md:px-8">
            <h1 className="display-wide text-[clamp(3.6rem,11vw,11.5rem)]">Floor<br />check</h1>
          </div>
        </header>

        <Story />

        <section className="border-t border-ink" aria-label="Open the prototype">
          <ul>
            {ROLES.map((r) => (
              <li key={r.href} className="border-b border-ink">
                <Link href={r.href} className="group block transition-colors duration-300 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none">
                  <span className="mx-auto flex max-w-[1600px] items-baseline justify-between gap-6 px-4 py-6 md:px-8 md:py-8">
                    <span className="display-wide text-[clamp(2.6rem,7vw,6.5rem)] transition-transform duration-300 group-hover:translate-x-3">{r.title}</span>
                    <span className="text-sm text-ash-700 group-hover:text-paper/70">{r.kind} ↗</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mx-auto max-w-[1600px] px-4 py-8 text-sm text-ash-700 md:px-8">Fictional prototype. Simulated data.</footer>
      </main>
    </>
  );
}
