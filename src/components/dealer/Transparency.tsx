import { TierBadge } from "@/components/ui/TierBadge";
import { TIER_ORDER } from "@/config/tiers";
import { FREQUENCY } from "./tierCopy";

const CHECKS = [
  { title: "Check-in photos", body: "VIN, plate, odometer, place and time" },
  { title: "Spot checks", body: "A local verifier sees a few cars. Random, short, paid by us" },
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
    <div>
      <section>
        <h2 className="px-4 pt-10 pb-5 display-wide text-[1.5rem]">What we look at</h2>
        <dl>
          {CHECKS.map((c) => (
            <div key={c.title} className="border-t border-line px-4 py-4">
              <dt className="font-medium">{c.title}</dt>
              <dd className="mt-0.5 text-sm text-ash-700">{c.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-ink">
        <h3 className="px-4 pt-8 pb-5 display-wide text-[1.5rem]">Tiers</h3>
        <ul>
          {[...TIER_ORDER].reverse().map((t) => (
            <li key={t} className="flex items-center justify-between gap-4 border-t border-line px-4 py-3.5">
              <TierBadge tier={t} />
              <span className="text-right text-sm">{FREQUENCY[t]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-ink">
        <h3 className="px-4 pt-8 pb-5 display-wide text-[1.5rem]">What we don&apos;t do</h3>
        <ul>
          {DONT.map((d) => (
            <li key={d} className="flex gap-3 border-t border-line px-4 py-4 text-sm">
              <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="mt-1 shrink-0 text-high"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" /></svg>
              {d}
            </li>
          ))}
        </ul>
      </section>
      <div className="border-t border-ink" />
    </div>
  );
}
