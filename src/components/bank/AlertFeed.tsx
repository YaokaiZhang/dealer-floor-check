"use client";
import { useState } from "react";
import type { Store } from "@/lib/store";
import { timeAgo, timeFi } from "@/lib/format";
import type { Alert } from "@/lib/types";
import { SEV_BAR, SOURCE_LABEL, SeverityTag, SourceIcon, StatusTag, isOpen, useNow } from "./shared";

const SEV_RANK = { high: 0, medium: 1, low: 2 } as const;

export function AlertFeed({ s, selected, onSelect }: { s: Store; selected: string | null; onSelect: (id: string) => void }) {
  const now = useNow(5000);
  // Only items that arrive while the page is open animate in; the initial list just appears.
  const [initial] = useState(() => new Set(s.alerts.map((a) => a.id)));
  const fresh = (id: string) => !initial.has(id);
  const newest = (a: Alert, b: Alert) => b.createdAt.localeCompare(a.createdAt);
  // What needs action first: open alerts by severity, then newest; closed ones below.
  const open = s.alerts.filter(isOpen).sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || newest(a, b));
  const closed = s.alerts.filter((a) => !isOpen(a)).sort(newest);
  const connected = s.cars.filter((c) => c.connected && c.status === "in_stock").length;

  const row = (a: Alert) => {
    const d = s.dealers.find((x) => x.id === a.dealerId)!;
    const car = s.cars.find((c) => c.vin === a.vin);
    const done = !isOpen(a);
    const visit = a.spotCheckId ? s.spotChecks.find((v) => v.id === a.spotCheckId) : undefined;
    return (
      <li key={a.id} className={fresh(a.id) ? "alert-new" : undefined}>
        <button
          type="button"
          onClick={() => onSelect(a.id)}
          aria-current={selected === a.id}
          className={`relative block w-full py-3 pr-4 pl-5 text-left transition-colors hover:bg-mist focus-visible:outline-offset-[-3px] ${selected === a.id ? "bg-brand-soft" : ""}`}
        >
          <span className={`absolute inset-y-0 left-0 w-1.5 ${done ? "bg-ash-300" : SEV_BAR[a.severity]}`} aria-hidden />
          <span className="flex items-baseline justify-between gap-3">
            <span className={`font-semibold leading-snug ${done ? "text-ash-700" : ""}`}>{d.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-ash-700" title={timeFi(a.createdAt)}>{timeAgo(a.createdAt, now)}</span>
          </span>
          <span className={`mt-0.5 block text-sm leading-snug ${done ? "text-ash-700" : ""}`}>{a.message}</span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            {!done && <SeverityTag severity={a.severity} />}
            <StatusTag alert={a} visit={visit} />
            <span className="inline-flex items-center gap-1 text-xs text-ash-700">
              <SourceIcon source={a.source} />
              {SOURCE_LABEL[a.source]}{car ? `, ${car.make} ${car.model} ${car.plate}` : ""}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <section aria-labelledby="alerts-h" className="flex h-full flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="alerts-h" className="display-md">Live alerts</h2>
        <span className="text-sm tabular-nums text-ash-700">{open.length ? <><b className="font-semibold text-ink">{open.length}</b> open</> : "None open"}</span>
      </div>
      <div className="flex flex-1 flex-col border border-line bg-paper">

      <ol aria-live="polite" aria-label="Open alerts" className={`divide-y divide-line ${open.length === 0 ? "flex flex-1 items-center justify-center text-center" : ""}`}>
        {open.length === 0 && (
          <li className="px-5 py-6">
            <p className="display-md">All quiet</p>
            <p className="mt-1 text-sm text-ash-700">Watching {connected} connected cars, marketplaces and the registry.</p>
          </li>
        )}
        {open.map(row)}
      </ol>

      {closed.length > 0 && (
        <>
          <h3 className="border-y border-line bg-mist px-4 py-1.5 text-xs text-ash-700">Closed ({closed.length})</h3>
          <ol aria-label="Closed alerts" className="divide-y divide-ash-300">{closed.map(row)}</ol>
        </>
      )}
      </div>
    </section>
  );
}
