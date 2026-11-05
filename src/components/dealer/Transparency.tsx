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

const DONT = [
  "No phone tracking. Location only during a check-in you start.",
  "No automatic changes to your terms.",
  "No sharing with other dealers.",
];

export function Transparency() {
  return (
    <div className="space-y-9">
      <section>
        <h2 className="display-lg">What Aurora checks, and why</h2>
        <p className="mt-3 text-ash-700">Data first, so we rarely ask and only drop by now and then.</p>
      </section>

      <section>
        <h3 className="display-md">What we look at</h3>
        <dl className="mt-3 divide-y divide-ash-300 border-y border-ink">
          {CHECKS.map((c) => (
            <div key={c.title} className="py-3.5">
              <dt className="font-medium">{c.title}</dt>
              <dd className="mt-0.5 text-sm text-ash-700">{c.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3 className="display-md">How tiers work</h3>
        <ul className="mt-3 divide-y divide-ash-300 border-y border-ink">
          {[...TIER_ORDER].reverse().map((t) => (
            <li key={t} className="flex items-center justify-between gap-4 py-3">
              <TierBadge tier={t} />
              <span className="text-right text-sm">{FREQUENCY[t]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-ink bg-mist p-5">
        <h3 className="display-md">What we don&apos;t do</h3>
        <ul className="mt-3 space-y-2.5 text-sm">
          {DONT.map((d) => (
            <li key={d} className="flex gap-3">
              <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="mt-1 shrink-0"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" /></svg>
              {d}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
