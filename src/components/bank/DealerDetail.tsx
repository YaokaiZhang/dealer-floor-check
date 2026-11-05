"use client";
import { useState } from "react";
import type { Store } from "@/lib/store";
import { actions } from "@/lib/store";
import type { CheckIn, Dealer, HistoryEntry, PhotoCheck, SpotCheck, Tier } from "@/lib/types";
import { isAutoVerified, portfolioStats, riskScore, samplingFor } from "@/lib/risk";
import { dateFi, eur, eurCompact, pct, timeFi } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { TIERS, TIER_ORDER } from "@/config/tiers";
import { Tag } from "@/components/ui/Tag";
import { TierBadge } from "@/components/ui/TierBadge";
import { Button } from "@/components/ui/Button";
import { RiskBreakdown, riskTone, riskWord } from "./Portfolio";
import { SamplingFlow } from "./Sampling";
import { Check, H, SEV_BAR, SourceTag, StatusTag, isOpen } from "./shared";

export function DealerDetail({ s, d, onAlert }: { s: Store; d: Dealer; onAlert: (id: string) => void }) {
  const st = portfolioStats(s, d.id);
  const risk = riskScore(s, d);
  const { explanation } = samplingFor(s, d);
  const tier = TIERS[d.tier];
  const checkIns = s.checkIns.filter((c) => c.dealerId === d.id);
  const visits = s.spotChecks.filter((v) => v.dealerId === d.id);
  const alerts = s.alerts.filter((a) => a.dealerId === d.id);

  return (
    <div>
      <header className="border-b border-line bg-mist p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="display-xl">{d.name}</h2>
            <p className="mt-2 text-sm text-ash-700">{d.city}. Contact {d.contact}</p>
          </div>
          <TierBadge tier={d.tier} size="lg" />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          <Fig k="Credit line" v={eurCompact(d.creditLine)} sub={`${pct(st.financedTotal / d.creditLine)} used`} />
          <Fig k="Cars financed" v={String(st.cars.length)} sub={eurCompact(st.financedTotal)} />
          <Fig k="Auto-verified" v={`${st.autoVerified.length}`} sub={`${pct(st.cars.length ? st.autoVerified.length / st.cars.length : 0)} today`} />
          <Fig k="Tier perks" v={tier.rateDiscountPp ? `−${tier.rateDiscountPp} pp` : "—"} sub={`${tier.topUp.speed} top-up, ~${tier.checkInsPerYear} check‑ins/yr`} />
        </dl>
      </header>

      <div className="space-y-10 p-4 md:p-6">
        {alerts.length > 0 && (
          <section>
            <H note={`${alerts.filter(isOpen).length} open`}>Alerts</H>
            <ul className="mt-3 divide-y divide-line border border-line">
              {alerts.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => onAlert(a.id)} className={`relative block w-full py-3 pr-3 pl-5 text-left text-sm hover:bg-mist ${isOpen(a) ? "" : "text-ash-700"}`}>
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${isOpen(a) ? SEV_BAR[a.severity] : "bg-ash-300"}`} aria-hidden />
                    <span className="block font-medium leading-snug">{a.message}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <SourceTag source={a.source} />
                      <StatusTag alert={a} visit={a.spotCheckId ? s.spotChecks.find((v) => v.id === a.spotCheckId) : undefined} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid gap-8 md:grid-cols-[14rem_1fr]">
          <div>
            <H>Risk score</H>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="figure text-7xl">{risk.score}</span>
              <span className="text-sm text-ash-700">/ 100, {riskWord(risk.score).toLowerCase()}</span>
            </p>
            <div className="mt-2 h-2 bg-ash-100"><div className={`h-full ${riskTone(risk.score)}`} style={{ width: `${risk.score}%` }} /></div>
          </div>
          <RiskBreakdown parts={risk.parts} score={risk.score} />
        </section>

        <section>
          <H note="how many cars the next random check-in asks for">Sampling</H>
          <div className="mt-3"><SamplingFlow e={explanation} /></div>
        </section>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <H note={`${tier.visit.perYear}× a year, unannounced`}>Spot checks</H>
            <Button variant="secondary" className="py-1.5" disabled={!!visits.find((v) => v.verifier.status !== "reported")} onClick={() => actions.sendSpotCheck(d.id)}>
              Post spot check
            </Button>
          </div>
          {visits.length === 0 && <p className="mt-3 text-sm text-ash-700">None this session.</p>}
          <div className="mt-3 space-y-4">
            {visits.map((v) => <VisitCard key={v.id} v={v} s={s} />)}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <H note="photo checks against the bank's records">Check-ins</H>
            <Tag tone="ink">Bank only</Tag>
          </div>
          {checkIns.length === 0 && <p className="mt-3 text-sm text-ash-700">None this session.</p>}
          <div className="mt-3 space-y-4">
            {checkIns.map((c) => <CheckInCard key={c.id} c={c} s={s} />)}
          </div>
          <History entries={d.history} />
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <H>Tier history</H>
            <ol className="mt-3 border-l border-line">
              {[...d.tierHistory].reverse().map((t, i) => (
                <li key={i} className="relative pb-4 pl-5">
                  <span className="absolute top-1 -left-[5px] size-[9px] border border-line bg-paper" />
                  <div className="flex items-center gap-2"><TierBadge tier={t.tier} /><span className="tag-text text-ash-700">{dateFi(t.date)}</span></div>
                  <p className="mt-1 text-sm">{t.reason}</p>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <H>Manual tier override</H>
            <label className="mt-3 block text-sm">
              <span className="sr-only">Tier</span>
              <select
                value={d.tier}
                onChange={(e) => actions.overrideTier(d.id, e.target.value as Tier)}
                className="mt-2 block w-full border border-line bg-paper px-3 py-2.5 font-semibold"
              >
                {[...TIER_ORDER].reverse().map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ash-700">Catch if missing</dt><dd className="tabular-nums">{+(tier.sampling.p * 100).toFixed(1)}%</dd>
              <dt className="text-ash-700">Detection target</dt><dd className="tabular-nums">{pct(tier.sampling.confidence)} a year</dd>
              <dt className="text-ash-700">Top-up</dt><dd className="tabular-nums">{tier.topUp.amount ? eur(tier.topUp.amount) : "paused"}</dd>
            </dl>
          </div>
        </section>

        <CarList s={s} d={d} />
      </div>
    </div>
  );
}

function Fig({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="bg-paper p-3">
      <dt className="tag-text text-ash-700">{k}</dt>
      <dd className="mt-1 figure text-3xl">{v}</dd>
      <dd className="mt-1 text-xs text-ash-700">{sub}</dd>
    </div>
  );
}

const PHOTO_HEAD = (
  <thead className="tag-text text-ash-700">
    <tr className="border-b border-ash-300">
      <th className="p-2 font-normal">Photo</th>
      <th className="p-2 font-normal">VIN read</th>
      <th className="p-2 font-normal">Plate · odometer</th>
      <th className="p-2 font-normal">Location</th>
      <th className="p-2 font-normal">Freshness</th>
      <th className="p-2 font-normal">Reuse</th>
      <th className="p-2 font-normal">Result</th>
    </tr>
  </thead>
);

const VISIT_STATUS: Record<SpotCheck["verifier"]["status"], string> = { offered: "posted", en_route: "en route", on_site: "on site", reported: "reported" };

function VisitCard({ v, s }: { v: SpotCheck; s: Store }) {
  const j = v.verifier;
  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-mist px-3 py-2">
        <Tag tone={v.reason === "brought_forward" ? "brand" : "outline"}>{v.reason === "brought_forward" ? "brought forward" : "random"}</Tag>
        <Tag tone={v.outcome === "clean" ? "lime" : v.outcome ? "high" : "muted"}>{v.outcome ?? VISIT_STATUS[j.status]}</Tag>
        <span className="text-sm">{j.name} · {j.visitCode} · {eur(j.fee)}</span>
        <span className="ml-auto tag-text text-ash-700">{v.sampledVins.length} cars{j.simulated ? " · simulated" : ""}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          {PHOTO_HEAD}
          <tbody>
            {v.sampledVins.map((vin) => {
              const r = v.results[vin];
              const car = s.cars.find((x) => x.vin === vin);
              const label = car ? `${car.make} ${car.model}` : "";
              const flagged = v.alertIds.some((id) => s.alerts.find((a) => a.id === id)?.vin === vin);
              const lead = <><span className="font-mono">{vin}</span> <span className="text-ash-500">· {label}</span>{flagged && <Tag tone="brand" className="ml-1">flagged</Tag>}</>;
              if (!r) return <tr key={vin} className="border-b border-ash-100"><td className="p-2" colSpan={7}>{lead} <span className="text-ash-500">· {j.status === "reported" ? "not checked" : "waiting"}</span></td></tr>;
              if (r.status === "missing") return <tr key={vin} className="border-b border-ash-100"><td className="p-2" colSpan={6}>{lead} <span className="ml-1">{r.reason ?? "Not on the lot"}</span></td><td className="p-2"><Tag tone="high">not on lot</Tag></td></tr>;
              if (!r.photo) return <tr key={vin} className="border-b border-ash-100"><td className="p-2" colSpan={6}>{lead} <span className="text-ash-500">· found (simulated report, no photos)</span></td><td className="p-2"><Tag tone="lime">found</Tag></td></tr>;
              return <PhotoRow key={vin} r={r.photo} label={flagged ? `${label} · flagged` : label} />;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckInCard({ c, s }: { c: CheckIn; s: Store }) {
  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-mist px-3 py-2">
        <Tag tone={c.reason === "targeted" ? "brand" : "outline"}>{c.reason}</Tag>
        <Tag tone={c.outcome === "clean" ? "lime" : c.outcome ? "high" : "muted"}>{c.outcome ?? c.status.replace("_", " ")}</Tag>
        <span className="text-sm">{c.window ? c.window.label : `Requested ${timeFi(c.createdAt)}`}</span>
        <span className="ml-auto tag-text text-ash-700">{c.sampledVins.length ? `${c.sampledVins.length} car${c.sampledVins.length > 1 ? "s" : ""} drawn` : "VINs drawn at start"}</span>
      </div>
      {c.sampledVins.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="tag-text text-ash-700">
              <tr className="border-b border-ash-300">
                <th className="p-2 font-normal">Photo</th>
                <th className="p-2 font-normal">VIN read</th>
                <th className="p-2 font-normal">Plate · odometer</th>
                <th className="p-2 font-normal">Location</th>
                <th className="p-2 font-normal">Freshness</th>
                <th className="p-2 font-normal">Reuse</th>
                <th className="p-2 font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {c.sampledVins.map((vin) => {
                const r = c.results[vin];
                const car = s.cars.find((x) => x.vin === vin);
                if (!r) return <tr key={vin} className="border-b border-ash-100"><td className="p-2" colSpan={7}><span className="font-mono">{vin}</span> <span className="text-ash-500">· waiting for photo</span></td></tr>;
                if ("skipped" in r) return <tr key={vin} className="border-b border-ash-100"><td className="p-2" colSpan={7}><span className="font-mono">{vin}</span> <Tag tone="muted">skipped by dealer</Tag></td></tr>;
                return <PhotoRow key={vin} r={r} label={car ? `${car.make} ${car.model}` : ""} />;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PhotoRow({ r, label }: { r: PhotoCheck; label: string }) {
  const matchTone = r.vinMatch === "exact" ? "lime" : r.vinMatch === "ocr_tolerant" ? "brand" : "high";
  return (
    <tr className="border-b border-ash-100 align-top">
      <td className="p-2">
        {r.thumbnail
          ? <span className="flex gap-1">
              {(["vin", "car", "odometer"] as const).map((k) => {
                const src = r.thumbnails?.[k] ?? (k === "vin" ? r.thumbnail : undefined);
                return src
                  ? // eslint-disable-next-line @next/next/no-img-element
                    <img key={k} src={src} alt={`${k === "vin" ? "VIN plate" : k === "car" ? "Car" : "Odometer"} photo for ${r.vin}`} className="h-12 w-16 border border-line object-cover" />
                  : null;
              })}
            </span>
          : <span className="flex h-12 w-16 items-center justify-center border border-ash-300 bg-mist tag-text text-ash-500">no img</span>}
        {r.capture === "simulated" && <Tag tone="muted" className="mt-1">simulated camera</Tag>}
        {r.reader === "claude" && <Tag tone="muted" className="mt-1">read by Claude vision</Tag>}
      </td>
      <td className="p-2">
        <span className="block font-mono">{r.readVin ?? "unreadable"}</span>
        <span className="mt-1 flex items-center gap-1"><Tag tone={matchTone}>{r.vinMatch.replace("_", " ")}</Tag><span className="tabular-nums">{Math.round(r.confidence * 100)}%</span></span>
        <span className="mt-0.5 block text-ash-500">{label}</span>
      </td>
      <td className="p-2">
        {r.plate ? <span className="flex items-center gap-1 whitespace-nowrap"><Check ok={r.plate.match} /><span className="font-mono">{r.plate.read ?? "unreadable"}</span></span> : <span className="text-ash-500">—</span>}
        {r.odometer && (
          <span className="mt-1 flex items-center gap-1 whitespace-nowrap">
            <Check ok={r.odometer.plausible} />
            <span className="font-mono tabular-nums">{r.odometer.readKm != null ? `${r.odometer.readKm.toLocaleString("en")} km` : "unreadable"}</span>
          </span>
        )}
        {r.odometer?.deltaKm != null && <span className="mt-0.5 block text-ash-500 tabular-nums">+{r.odometer.deltaKm.toLocaleString("en")} km since last</span>}
      </td>
      <td className="p-2">
        {r.location ? (
          <>
            <span className="flex items-center gap-1"><Check ok={r.location.inside} />{r.location.inside ? "inside lot" : `${formatDistance(r.location.distanceM)} away`}</span>
            <span className="mt-0.5 block text-ash-500">±{Math.round(r.location.accuracyM)} m</span>
            {r.location.simulated && <Tag tone="muted" className="mt-1">simulated</Tag>}
          </>
        ) : <span className="text-ash-500">no location</span>}
      </td>
      <td className="p-2">
        <span className="flex items-center gap-1"><Check ok={r.freshness.insideWindow} />{r.freshness.insideWindow ? "in window" : "outside window"}</span>
        <span className="mt-0.5 block text-ash-500">{timeFi(r.freshness.receivedAt)}{r.freshness.exifTime ? ` · EXIF ${timeFi(r.freshness.exifTime)}` : ""}</span>
      </td>
      <td className="p-2">
        <span className="flex items-center gap-1"><Check ok={!r.reuse.duplicate} />{r.reuse.duplicate ? "duplicate" : "unique"}</span>
        <span className="mt-0.5 block text-ash-500 tabular-nums">hamming {Number.isFinite(r.reuse.nearestDistance) ? r.reuse.nearestDistance : "—"}</span>
      </td>
      <td className="p-2"><Tag tone={r.verified ? "lime" : "high"}>{r.verified ? "verified" : "not verified"}</Tag></td>
    </tr>
  );
}

const HK: Record<HistoryEntry["kind"], string> = { check_in: "Check-in", tier_change: "Tier", alert: "Alert", onboarding: "Onboarding", verifier: "Verifier" };
const HO: Record<HistoryEntry["outcome"], string> = { clean: "bg-lime", failed: "bg-high", skipped: "bg-medium", resolved: "bg-brand", info: "bg-paper" };

function History({ entries }: { entries: HistoryEntry[] }) {
  return (
    <div className="mt-6">
      <H>History</H>
      <ol className="mt-3 divide-y divide-ash-300 border-y border-line">
        {[...entries].reverse().map((h) => (
          <li key={h.id} className="grid grid-cols-[6.5rem_6rem_1fr] items-center gap-2 py-2 text-sm">
            <span className="text-xs tabular-nums text-ash-700">{dateFi(h.date)}</span>
            <span className="flex items-center gap-1.5 tag-text"><span className={`size-2.5 border border-line ${HO[h.outcome]}`} />{HK[h.kind]}</span>
            <span>{h.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CarList({ s, d }: { s: Store; d: Dealer }) {
  const [all, setAll] = useState(false);
  const cars = s.cars.filter((c) => c.dealerId === d.id);
  const shown = all ? cars : cars.slice(0, 8);
  const STATUS: Record<string, string> = { in_stock: "in stock", sold_paid: "sold, paid", sold_unpaid_suspect: "sold out of trust" };
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <H note={`${cars.filter((c) => c.connected).length} connected`}>Cars ({cars.length})</H>
      </div>
      <div className="mt-3 overflow-x-auto border border-line">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-mist tag-text text-ash-700">
            <tr>
              <th className="p-2 font-normal">VIN</th><th className="p-2 font-normal">Car</th><th className="p-2 font-normal">Plate</th>
              <th className="p-2 text-right font-normal">Loan</th><th className="p-2 font-normal">Connected</th><th className="p-2 font-normal">Auto today</th><th className="p-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.vin} className="border-t border-ash-100">
                <td className="p-2 font-mono">{c.vin}</td>
                <td className="p-2">{c.year} {c.make} {c.model}</td>
                <td className="whitespace-nowrap p-2 font-mono">{c.plate}</td>
                <td className="p-2 text-right tabular-nums">{eur(c.loanAmount)}</td>
                <td className="p-2"><Check ok={c.connected} /></td>
                <td className="p-2"><Check ok={isAutoVerified(s, c)} /></td>
                <td className="p-2">{c.status === "sold_unpaid_suspect" ? <Tag tone="high">{STATUS[c.status]}</Tag> : <span className={c.status === "sold_paid" ? "text-ash-500" : ""}>{STATUS[c.status]}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cars.length > 8 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-2 border border-line px-3 py-1.5 tag-text hover:bg-brand">
          {all ? "Show fewer" : `Show all ${cars.length} cars`}
        </button>
      )}
    </section>
  );
}
