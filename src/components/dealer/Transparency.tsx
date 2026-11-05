import { SectionTag } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/TierBadge";
import { TIER_ORDER } from "@/config/tiers";
import { FREQUENCY } from "./tierCopy";

const CHECKS = [
  { title: "Check-in photos", body: "VIN, plate, odometer, place and time" },
  { title: "Spot checks", body: "Now and then a local verifier drops by to see a few cars. Random, short, paid by us" },
  { title: "Connected cars", body: "Cars seen on your lot count as checked (with consent)" },
  { title: "Public registry", body: "Ownership changes" },
  { title: "Marketplaces", body: "Listings of financed cars" },
];

export function Transparency() {
  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <SectionTag>Open about the rules</SectionTag>
        <h2 className="mt-3 display-lg">What Aurora checks, and why</h2>
        <p className="mt-3 text-ash-700">Data first, so we rarely ask and only drop by now and then.</p>
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
        <SectionTag>How tiers work</SectionTag>
        <ul className="mt-3 divide-y divide-ink border border-ink">
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
          <li className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 bg-ink" />No phone tracking. Location only during a check-in you start.</li>
          <li className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 bg-ink" />No automatic changes to your terms.</li>
          <li className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 bg-ink" />No sharing with other dealers.</li>
        </ul>
      </section>
    </div>
  );
}
