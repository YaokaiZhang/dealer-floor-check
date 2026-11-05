import { Button } from "@/components/ui/Button";
import { eur } from "@/lib/format";
import type { Job } from "./shared";

export function OfferCard({ job, onAccept, onDecline }: { job: Job; onAccept: () => void; onDecline: () => void }) {
  const { dealer, visit, cars } = job;
  // Fictional travel distance for the demo: verifiers are matched within the dealer's city.
  const km = 2 + (parseInt(visit.id.replace(/\D/g, "").slice(-2) || "4", 10) % 9);
  const facts: [string, string][] = [["Cars", String(cars.length)], ["Away", `${km} km`], ["On site", `~${10 + cars.length * 5} min`]];
  return (
    <article className="animate-rise border border-line bg-paper" aria-label={`${dealer.name}, ${eur(visit.verifier.fee)}`}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h3 className="display-md">{dealer.name}</h3>
          <p className="mt-1 text-sm text-ash-700">{dealer.city}</p>
        </div>
        <span className="shrink-0 border border-line bg-lime px-2 py-1 figure text-3xl">{eur(visit.verifier.fee)}</span>
      </div>
      <dl className="grid grid-cols-3 border-y border-line">
        {facts.map(([k, v], i) => (
          <div key={k} className={`px-4 py-2.5 ${i > 0 ? "border-l border-line" : ""}`}>
            <dt className="text-xs text-ash-700">{k}</dt>
            <dd className="mt-0.5 figure text-xl">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-[1fr_auto] gap-2 p-3">
        <Button arrow className="min-h-12 text-base" onClick={onAccept}>Accept visit</Button>
        <Button variant="ghost" className="min-h-12 text-ash-700" onClick={onDecline}>Not now</Button>
      </div>
    </article>
  );
}
