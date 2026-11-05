import { RoleSwitcher } from "@/components/RoleSwitcher";
import { ButtonLink } from "@/components/ui/Button";
import { Card, SectionTag } from "@/components/ui/Card";
import { Marquee } from "@/components/ui/Marquee";
import { Tag } from "@/components/ui/Tag";

const ROLES = [
  { href: "/dealer", tag: "Mobile web", title: "Dealer app", body: "A friendly check-in, about three minutes, at a time the dealer picks. Clean check-ins unlock an instant credit-line top-up.", tone: "bg-lime" },
  { href: "/bank", tag: "Dashboard", title: "Bank dashboard", body: "Portfolio, live alerts from connected cars, marketplace and registry, statistically sized sampling and the cost / risk trade-off.", tone: "bg-brand" },
  { href: "/demo", tag: "Stage", title: "Demo control", body: "Fire simulated events: check-in requests, marketplace sales, registry changes, cars leaving the lot. Reset to seed.", tone: "bg-paper" },
];

export default function Home() {
  return (
    <>
      <RoleSwitcher />
      <main>
        <section className="mx-auto max-w-[1400px] px-4 pt-14 pb-16 md:px-8 md:pt-24">
          <SectionTag>Case 2 · Floor check</SectionTag>
          <h1 className="mt-4 max-w-5xl display-2xl animate-rise">Verify the floor without walking it.</h1>
          <p className="mt-6 max-w-2xl text-lg text-ash-700 md:text-xl">
            Aurora Dealer Finance confirms its collateral from data first: connected cars, marketplace listings and the vehicle registry.
            Dealers are asked for a few photos only now and then, and a physical visit is the last resort.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/bank" arrow>Open bank dashboard</ButtonLink>
            <ButtonLink href="/dealer" variant="secondary" arrow>Open dealer app</ButtonLink>
          </div>
        </section>
        <Marquee items={["Data first, people last", "Trust grows over time", "A check-in, never an audit", "Open about the rules"]} />
        <section className="mx-auto grid max-w-[1400px] gap-6 px-4 py-16 md:grid-cols-3 md:px-8">
          {ROLES.map((r) => (
            <a key={r.href} href={r.href} className="group block focus-visible:outline-none">
              <Card interactive className="flex h-full flex-col p-2">
                <div className={`relative aspect-[16/9] border border-ink ${r.tone} flex items-end p-4`}>
                  <Tag tone="ink" className="absolute top-2 left-2">{r.tag}</Tag>
                  <span className="display-xl">{r.title}</span>
                </div>
                <p className="px-2 pt-4 pb-3 text-ash-700">{r.body}</p>
              </Card>
            </a>
          ))}
        </section>
        <footer className="border-t border-ink">
          <div className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-2 px-4 py-6 tag-text text-ash-700 md:px-8">
            <span>Hackathon prototype · fictional lender and dealers</span>
            <span>All external data sources are simulated</span>
          </div>
        </footer>
      </main>
    </>
  );
}
