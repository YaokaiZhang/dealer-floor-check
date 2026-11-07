import Link from "next/link";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Intro } from "@/components/home/Intro";
import { ScanCar } from "@/components/ui/ScanCar";
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
        <header className="relative mx-auto flex max-w-[1600px] flex-col gap-6 px-4 pt-10 pb-16 md:px-8 lg:min-h-[calc(86svh-4rem)] lg:justify-end lg:pt-14 lg:pb-12">
          <h1 className="display-wide relative z-10 text-[clamp(3.6rem,11vw,11.5rem)]">Floor<br />check</h1>
          <ScanCar scale={0.4} className="aspect-[4/3] w-full lg:absolute lg:top-0 lg:right-0 lg:bottom-[12%] lg:aspect-auto lg:h-auto lg:w-[58%]" title="A car turning in its bay while a scan passes over it" />
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
