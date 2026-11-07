"use client";
import { useState } from "react";
import { actions } from "@/lib/store";
import { dateFi, eur } from "@/lib/format";
import type { Car, DemoState } from "@/lib/types";
import { Bar, Check, TextAction } from "./Bar";

/** Sold cars whose loan is still open, soonest deadline first. */
export const payoffsDue = (s: DemoState, dealerId: string) =>
  s.cars
    .filter((c) => c.dealerId === dealerId && (c.status === "sold_awaiting_payoff" || c.status === "sold_unpaid_suspect"))
    .sort((a, b) => (a.sale?.payoffDueAt ?? "").localeCompare(b.sale?.payoffDueAt ?? ""));

const carName = (c: Car) => `${c.make} ${c.model}`;

function dueText(c: Car) {
  if (!c.sale) return "Sold";
  return Date.parse(c.sale.payoffDueAt) < Date.now() ? `Was due ${dateFi(c.sale.payoffDueAt)}` : `Due ${dateFi(c.sale.payoffDueAt)}`;
}

/** Tap once to see the amount, tap again to pay. */
function useConfirm(vin: string) {
  const [confirming, setConfirming] = useState(false);
  return {
    confirming,
    ask: () => setConfirming(true),
    cancel: () => setConfirming(false),
    pay: () => { setConfirming(false); actions.payoffReceived(vin); },
  };
}

function Confirm({ car, onPay, onCancel }: { car: Car; onPay: () => void; onCancel: () => void }) {
  return (
    <div className="animate-rise">
      <Bar tone="brand" onClick={onPay} autoFocus>Pay {eur(car.loanAmount)}</Bar>
      <p className="border-t border-line px-4 pt-3 text-sm text-ash-700">From your business account. The loan closes right away.</p>
      <TextAction onClick={onCancel}>Cancel</TextAction>
    </div>
  );
}

/** Shown on top of the check-ins tab while a sold car still has an open loan. */
export function PayoffDueCard({ car }: { car: Car }) {
  const c = useConfirm(car.vin);
  return (
    <section className="animate-rise border-b border-ink" aria-label={`Payoff for ${carName(car)}`}>
      <div className="px-4 pt-10 pb-6">
        <h2 className="display-wide text-[1.9rem]">Payoff due</h2>
        <p className="mt-4 font-medium">{carName(car)} <span className="text-ash-700">{car.plate}</span></p>
        <p className="mt-1 text-sm text-ash-700">Sold. {dueText(car)}</p>
      </div>
      {c.confirming ? <Confirm car={car} onPay={c.pay} onCancel={c.cancel} /> : <Bar onClick={c.ask}>Pay off {eur(car.loanAmount)}</Bar>}
    </section>
  );
}

function Row({ car, sub, emphasis }: { car: Car; sub: string; emphasis?: boolean }) {
  const c = useConfirm(car.vin);
  return (
    <li className="border-t border-line">
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <p className="font-medium [overflow-wrap:anywhere]">{carName(car)} <span className="text-ash-700">{car.plate}</span></p>
          <p className={`mt-0.5 text-sm ${emphasis ? "text-ink" : "text-ash-700"}`}>{sub}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="figure text-lg">{eur(car.loanAmount)}</span>
          {!c.confirming && (
            <button type="button" onClick={c.ask} className={`min-h-10 border px-3 text-sm font-medium transition-colors ${emphasis ? "border-ink bg-ink text-paper hover:bg-ink/85" : "border-ink hover:bg-ink hover:text-paper"}`}>
              Pay off
            </button>
          )}
        </div>
      </div>
      {c.confirming && <Confirm car={car} onPay={c.pay} onCancel={c.cancel} />}
    </li>
  );
}

export function Payoffs({ state, dealerId }: { state: DemoState; dealerId: string }) {
  const due = payoffsDue(state, dealerId);
  const onLot = state.cars.filter((c) => c.dealerId === dealerId && c.status === "in_stock");
  const paid = state.cars
    .filter((c) => c.dealerId === dealerId && c.paidAt)
    .sort((a, b) => b.paidAt!.localeCompare(a.paidAt!))
    .slice(0, 5);
  const total = [...due, ...onLot].reduce((s, c) => s + c.loanAmount, 0);

  return (
    <div>
      <section className="flex items-end justify-between gap-4 px-4 pt-10 pb-8">
        <div>
          <p className="text-sm text-ash-700">Open loans</p>
          <p className="mt-3 figure text-[2.25rem]">{eur(total)}</p>
        </div>
        <p className="text-sm text-ash-700">{due.length + onLot.length} cars</p>
      </section>

      {due.length > 0 && (
        <Group title="Sold">
          {due.map((c) => <Row key={c.vin} car={c} sub={dueText(c)} emphasis />)}
        </Group>
      )}

      <Group title="On the lot">
        {onLot.length ? onLot.map((c) => <Row key={c.vin} car={c} sub={`Financed since ${dateFi(c.loanOpenedAt)}`} />) : <li className="border-t border-line px-4 py-4 text-sm text-ash-700">No open loans.</li>}
      </Group>

      {paid.length > 0 && (
        <Group title="Paid off">
          {paid.map((c) => (
            <li key={c.vin} className="flex items-center justify-between gap-3 border-t border-line px-4 py-4">
              <div className="min-w-0">
                <p className="font-medium">{carName(c)} <span className="text-ash-700">{c.plate}</span></p>
                <p className="mt-0.5 text-sm text-ash-700">{dateFi(c.paidAt!)}</p>
              </div>
              <span className="flex shrink-0 items-center gap-3">
                <span className="figure text-lg text-ash-700">{eur(c.loanAmount)}</span>
                <Check size={24} />
              </span>
            </li>
          ))}
        </Group>
      )}
      <div className="border-t border-ink" />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink">
      <h3 className="px-4 pt-8 pb-5 display-wide text-[1.5rem]">{title}</h3>
      <ul>{children}</ul>
    </section>
  );
}
