import { Card, SectionTag } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/TierBadge";
import { TIER_ORDER } from "@/config/tiers";
import { FREQUENCY } from "./tierCopy";

const CHECKS = [
  {
    title: "Photos at check-ins",
    body: "Now and then we ask you to photograph the VIN plate of a few cars. We read the VIN from the photo, and we check the photo's location and time to confirm it was taken on your lot during the window you picked. That's how a quick photo can stand in for a visit.",
  },
  {
    title: "Connected-car location",
    body: "If you've given consent, cars with a connected-car service share their position with us. Cars we can see on your lot count as checked, so we don't need to ask you about them.",
  },
  {
    title: "Public registry",
    body: "We look at the public vehicle registry for changes of ownership on cars we finance.",
  },
  {
    title: "Marketplace listings",
    body: "We follow public car marketplaces for listings of financed cars, so a car sold online and its loan can be matched up.",
  },
];

export function Transparency() {
  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <SectionTag>Open about the rules</SectionTag>
        <h2 className="mt-3 display-lg">What Aurora checks, and why</h2>
        <p className="mt-3 text-ash-700">
          Your cars are the security for your credit line. We confirm they&apos;re there using data first, so we only rarely need to ask you for anything and almost never need to visit.
        </p>
      </section>

      <section>
        <SectionTag>What we look at</SectionTag>
        <ol className="mt-3 border border-ink shadow-card">
          {CHECKS.map((c, i) => (
            <li key={c.title} className={`flex gap-4 bg-paper p-4 ${i > 0 ? "border-t border-ink" : ""}`}>
              <span className="figure text-2xl text-brand-deep">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="mt-1 text-sm text-ash-700">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTag>Why</SectionTag>
        <Card className="mt-3 bg-brand-soft! p-5">
          <p className="display-md">The more we can see from data, the less we ask of you</p>
          <p className="mt-2 text-sm text-ash-700">
            These checks keep check-ins rare and short, and they keep your terms good. They replace most of the in-person floor checks you may know from other lenders.
          </p>
        </Card>
      </section>

      <section>
        <SectionTag>How tiers work</SectionTag>
        <p className="mt-3 text-sm text-ash-700">
          Every dealer has a tier. Clean check-ins move you up one step at a time, and each step means fewer check-ins and better terms.
          If something in the data needs a closer look, a person at Aurora reviews it and talks with you. Nothing changes without a conversation.
        </p>
        <ul className="mt-4 divide-y divide-ink border border-ink">
          {[...TIER_ORDER].reverse().map((t) => (
            <li key={t} className="flex items-center justify-between gap-3 px-4 py-3">
              <TierBadge tier={t} />
              <span className="text-right text-sm">{FREQUENCY[t]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTag>What we don&apos;t do</SectionTag>
        <ul className="mt-3 space-y-2 text-sm text-ash-700">
          <li className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 bg-ink" />We don&apos;t track your phone. Your location is read only during a check-in you started.</li>
          <li className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 bg-ink" />We don&apos;t change your credit line or terms automatically. A person always decides, together with you.</li>
          <li className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 bg-ink" />We don&apos;t share your data with other dealers.</li>
        </ul>
      </section>
    </div>
  );
}
