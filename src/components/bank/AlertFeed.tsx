"use client";
import type { Store } from "@/lib/store";
import { timeAgo, timeFi } from "@/lib/format";
import { SectionTag } from "@/components/ui/Card";
import { SEV_BAR, SeverityTag, SourceTag, StatusTag, isOpen, useNow } from "./shared";

export function AlertFeed({ s, selected, onSelect }: { s: Store; selected: string | null; onSelect: (id: string) => void }) {
  const now = useNow(5000);
  const alerts = [...s.alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = alerts.filter(isOpen).length;
  const connected = s.cars.filter((c) => c.connected && c.status === "in_stock").length;

  return (
    <section aria-label="Live alert feed" className="border border-ink bg-paper shadow-card">
      <div className="flex items-center justify-between border-b border-ink bg-ink px-4 py-3 text-paper">
        <h2 className="flex items-center gap-2 display-md">
          <span className="inline-block size-2 animate-pulse-dot bg-lime" aria-hidden /> Live alerts
        </h2>
        <span className="tag-text text-brand">{open} open · newest first</span>
      </div>

      <ol aria-live="polite" className="divide-y divide-ink">
        {alerts.length === 0 && (
          <li className="p-5">
            <p className="display-md">All quiet.</p>
            <p className="mt-1 text-sm text-ash-700">
              Watching {connected} connected cars, marketplace listings and the vehicle registry for every financed car. Fire an event from Demo control to see one arrive here.
            </p>
          </li>
        )}
        {alerts.map((a) => {
          const d = s.dealers.find((x) => x.id === a.dealerId)!;
          const car = s.cars.find((c) => c.vin === a.vin);
          const closed = !isOpen(a);
          return (
            <li key={a.id} className="animate-rise">
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                aria-current={selected === a.id}
                className={`relative flex w-full gap-3 p-4 pl-5 text-left transition-colors hover:bg-mist ${selected === a.id ? "bg-brand-soft" : ""} ${closed ? "opacity-55" : ""}`}
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${SEV_BAR[a.severity]}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <SeverityTag severity={a.severity} />
                    <SourceTag source={a.source} />
                    <StatusTag alert={a} />
                    <span className="ml-auto tag-text text-ash-700" title={timeFi(a.createdAt)}>{timeAgo(a.createdAt, now)}</span>
                  </span>
                  <span className="mt-2 block font-semibold">{d.name}</span>
                  <span className="mt-0.5 block text-sm leading-snug">{a.message}</span>
                  <span className="mt-1.5 block font-mono text-xs text-ash-700">
                    {car ? `${car.make} ${car.model} · ${car.plate} · ` : ""}
                    {a.vin}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-ink p-4">
        <SectionTag>Activity</SectionTag>
        <ul className="mt-2 space-y-1.5">
          {s.events.slice(0, 6).map((e) => (
            <li key={e.id} className="grid grid-cols-[3rem_1fr] gap-2 text-xs animate-rise">
              <span className="font-mono text-ash-500">{timeFi(e.at)}</span>
              <span className="text-ash-700">{e.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
