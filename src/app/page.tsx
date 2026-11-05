import Link from "next/link";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Intro } from "@/components/home/Intro";
import { ScanCar } from "@/components/ui/ScanCar";
import { ASSUMPTIONS } from "@/config/assumptions";

/** Skip the cover for the rest of the session once someone has entered. Runs before paint. */
const SKIP_INTRO = `try{if(sessionStorage.getItem("aurora:entered"))document.documentElement.dataset.entered=""}catch(e){}`;

const LAYERS = [
  {
    when: "Every day",
    title: "Connected data",
    body: "Telematics and the vehicle registry say where each car is.",
    points: ["Location from the car itself", "Ownership changes from the registry", "A car that leaves or is sold raises an alert"],
  },
  {
    when: "Now and then",
    title: "Check-in",
    body: "The dealer photographs a few random cars, at a time they pick.",
    points: ["Three photos per car, in-app camera", "Plate, VIN and odometer read on the server", "Clean results earn a better tier"],
  },
  {
    when: "Last",
    title: "Spot check",
    body: "An unannounced verifier visits and checks a few cars.",
    points: [`€${ASSUMPTIONS.gigCheckCost} flat per visit`, "Sent when the signals disagree"],
  },
];

const ROLES = [
  { href: "/bank", title: "Bank", kind: "Desktop", body: "Portfolio, live alerts, sampling" },
  { href: "/dealer", title: "Dealer", kind: "Phone", body: "A short check-in, at a time they pick" },
  { href: "/verifier", title: "Verifier", kind: "Phone", body: "Random spot checks, a few cars each" },
  { href: "/demo", title: "Demo", kind: "Stage", body: "Fire simulated events" },
];

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP_INTRO }} />
      <Intro />
      <RoleSwitcher />
      <main className="overflow-x-clip">
        <header className="relative mx-auto flex max-w-[1600px] flex-col gap-6 px-4 pt-10 pb-16 md:px-8 lg:min-h-[calc(100svh-4rem)] lg:justify-between lg:pt-14 lg:pb-16">
          <h1 className="display-wide relative z-10 text-[clamp(3.6rem,11vw,11.5rem)]">Floor<br />check</h1>
          <ScanCar scale={0.4} className="aspect-[4/3] w-full lg:absolute lg:top-[10%] lg:right-0 lg:bottom-0 lg:aspect-auto lg:h-auto lg:w-[58%]" title="A car turning in its bay while a scan passes over it" />
          <div className="relative z-10 flex flex-wrap gap-x-12 gap-y-3 text-lg">
            <p>Aurora Dealer Finance<br /><span className="text-ash-700">Fictional lender</span></p>
            <p>Inventory finance<br /><span className="text-ash-700">250 dealers, Finland</span></p>
          </div>
        </header>

        <section className="mx-auto grid max-w-[1600px] gap-10 border-t border-ink px-4 py-16 md:px-8 lg:grid-cols-[1fr_2fr] lg:gap-16 lg:py-24">
          <h2 className="display-wide text-[clamp(2rem,3.6vw,3.25rem)] lg:sticky lg:top-24 lg:self-start">How a car gets verified</h2>
          <ol className="space-y-14">
            {LAYERS.map((l) => (
              <li key={l.title} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <span className="pt-1.5 text-sm text-ash-700">{l.when}</span>
                <div>
                  <h3 className="display-wide text-[clamp(1.6rem,2.6vw,2.4rem)]">{l.title}</h3>
                  <p className="mt-3 max-w-[44ch] text-lg">{l.body}</p>
                  <ul className="mt-4 space-y-1 text-ash-700">
                    {l.points.map((p) => (
                      <li key={p} className="relative pl-6 before:absolute before:left-0 before:content-['+']">{p}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-ink" aria-label="Open the prototype">
          <ul>
            {ROLES.map((r) => (
              <li key={r.href} className="border-b border-ink">
                <Link href={r.href} className="group block transition-colors duration-300 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none">
                  <span className="mx-auto grid max-w-[1600px] items-baseline gap-x-8 gap-y-1 px-4 py-6 md:grid-cols-[1fr_auto_auto] md:px-8 md:py-8">
                    <span className="display-wide text-[clamp(2.6rem,7vw,6.5rem)] transition-transform duration-300 group-hover:translate-x-3">{r.title}</span>
                    <span className="text-ash-700 group-hover:text-paper/70 md:text-right">{r.body}</span>
                    <span className="hidden w-20 text-right text-sm md:block">{r.kind} ↗</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mx-auto grid max-w-[1600px] gap-10 px-4 pt-24 pb-14 md:grid-cols-2 md:px-8">
          <div>
            <p className="display-wide text-[clamp(2.4rem,5vw,4.5rem)]">See it<br />live.</p>
            <Link href="/bank" className="mt-6 inline-block border-b-2 border-ink pb-1 text-2xl font-medium transition-opacity hover:opacity-60">Open bank dashboard</Link>
          </div>
          <p className="self-end text-sm text-ash-700 md:text-right">Hackathon prototype. Fictional lender and dealers.<br />All external data sources are simulated.</p>
        </footer>
      </main>
    </>
  );
}
