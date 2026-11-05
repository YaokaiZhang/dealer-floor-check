import { Button } from "@/components/ui/Button";
import { Odometer } from "@/components/ui/Odometer";
import { eur } from "@/lib/format";
import { ActionBar } from "./ActiveVisit";
import { carState, confirmed, Plate, STATE_LABEL, StateMark, type Job } from "./shared";

const SUMMARY_LABEL = { ...STATE_LABEL, unconfirmed: "Not confirmed", todo: "Not checked" };

/** The one moment worth marking: the report is in and the fee is earned. */
export function Reported({ job, onClose }: { job: Job; onClose: () => void }) {
  const { visit, dealer, cars } = job;
  const found = cars.filter((c) => confirmed(visit.results[c.vin])).length;
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <section className="border-b border-ink bg-lime px-4 pt-7 pb-6" role="status">
        <span className="flex size-14 animate-pop items-center justify-center bg-ink text-lime" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" pathLength={1} strokeDasharray={1} className="animate-draw" /></svg>
        </span>
        <h1 className="mt-5 display-xl">Report sent</h1>
        <p className="mt-3 figure text-6xl">+<Odometer value={eur(visit.verifier.fee)} /></p>
        <p className="mt-3 text-base">{found} of {cars.length} cars found at {dealer.name}.</p>
      </section>

      <ul className="divide-y divide-ash-300 border-b border-ink" aria-label="Your report">
        {cars.map((c) => {
          const st = carState(visit.results[c.vin]);
          return (
            <li key={c.vin} className="flex items-center gap-3 px-4 py-3">
              <StateMark state={st} className="size-7" />
              <span className="min-w-0 flex-1 truncate font-medium">{c.make} {c.model}</span>
              <Plate plate={c.plate} />
              <span className="w-24 shrink-0 text-right text-sm text-ash-700">{SUMMARY_LABEL[st]}</span>
            </li>
          );
        })}
      </ul>

      <ActionBar>
        <Button arrow className="min-h-14 w-full text-base" onClick={onClose}>Back to visits</Button>
      </ActionBar>
    </div>
  );
}
