"use client";
import { useId, useState } from "react";
import { curve, headline, traditional, withSignals, type CostPoint } from "@/lib/costModel";
import { ASSUMPTIONS } from "@/config/assumptions";
import { eur, eurCompact } from "@/lib/format";
import { useWidth } from "./shared";

/* Series colours validated with the dataviz palette checker (light surface, all pairs pass CVD + contrast).
   The traditional total uses the brand's ink on purpose; it is always direct-labelled and in the legend. */
const C = { check: "#0a9580", fraud: "#d9622b", total: "#000000", signals: "#1f4f9e" };

const SERIES = [
  { key: "check", label: "Check cost", sub: "traditional", color: C.check, width: 2, get: (t: CostPoint) => t.checkCost },
  { key: "fraud", label: "Expected fraud loss", sub: "traditional", color: C.fraud, width: 2, get: (t: CostPoint) => t.fraudLoss },
  { key: "total", label: "Total cost", sub: "traditional", color: C.total, width: 2.5, get: (t: CostPoint) => t.total },
] as const;

const A_LABELS: Record<keyof typeof ASSUMPTIONS, [string, (v: number) => string]> = {
  portfolioDealers: ["Dealers in portfolio", (v) => String(v)],
  auditorVisitCost: ["In-person check, per car", (v) => eur(v)],
  inPersonChecksToday: ["In-person car checks today / yr", (v) => v.toLocaleString("en")],
  incidentsPerDealerYear: ["Fraud incidents / dealer / yr", (v) => String(v)],
  avgLoanPerCar: ["Average loan per car", (v) => eur(v)],
  lossGivenFraud: ["Loss given fraud", (v) => `${v * 100}%`],
  extraCarsPerMonthUndetected: ["Extra cars / month undetected", (v) => String(v)],
  maxDetectionDays: ["Detection with no checks", (v) => `${v} days`],
  signalCoverage: ["Incidents caught by signals", (v) => `${v * 100}%`],
  signalDetectionDays: ["Detection when a signal fires", (v) => `${v} days`],
  payoffBusinessDays: ["Payoff window after a sale", (v) => `${v} business days`],
  checkInHandlingCost: ["Self-check, per car", (v) => eur(v)],
  carsPerCheckIn: ["Cars per self-check", (v) => String(v)],
  checkInsPerDealerYear: ["Check-ins / dealer / yr", (v) => String(v)],
  gigCheckCost: ["Local verifier, per car", (v) => eur(v)],
  avgCarsPerVisit: ["Cars per spot check", (v) => String(v)],
  gigChecksPerDealerYear: ["Spot checks / dealer / yr", (v) => String(v)],
  dataFeedCostPerDealerYear: ["Data feeds / dealer / yr", (v) => eur(v)],
  fullCountsPerYear: ["Full counts / yr", (v) => String(v)],
  carsPerFullCount: ["Cars per full count", (v) => String(v)],
  aiCostPerCar: ["AI processing, per car", (v) => `€${v.toFixed(2)}`],
  riskModelPerYear: ["Risk model / yr", (v) => eur(v)],
  appMaintenancePerYear: ["App maintenance / yr", (v) => eur(v)],
  maxScheduledChecks: ["Max in-person car checks (x-axis)", (v) => `${v} / yr`],
};

export function CostChart() {
  const trad = curve(traditional);
  const sig = curve(withSignals);
  const h = headline();
  const [f, setF] = useState(h.traditional.f);
  const [hover, setHover] = useState<number | null>(null);
  const [ref, w] = useWidth<HTMLDivElement>(720);
  const clip = useId();
  const N = ASSUMPTIONS.maxScheduledChecks;

  const narrow = w < 520;
  const H = narrow ? 280 : 360;
  const L = narrow ? 44 : 56, R = narrow ? 12 : 20, T = 16, B = 34;
  const iw = Math.max(120, w - L - R), ih = H - T - B;
  // Cap the y-axis just above f=1 so the interesting region is readable; f=0 is labelled off-chart.
  const yMax = Math.ceil(trad[1].total / 5000) * 5000;
  const x = (v: number) => L + (v / N) * iw;
  const y = (v: number) => T + (1 - Math.min(v, yMax * 1.04) / yMax) * ih;
  const line = (pts: number[]) => pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const yTicks = Array.from({ length: yMax / 5000 + 1 }, (_, i) => i * 5000);

  const at = (k: number) => ({ t: trad[k], s: sig[k] });
  const cur = at(f);
  const hv = hover !== null ? at(hover) : null;
  const tMin = h.traditional, sMin = h.signals;

  // Direct labels placed where curves are well separated.
  const labels = [
    { text: "Curb with signals", fx: narrow ? 1.2 : 0.9, v: sig[1].total, dy: 18, color: C.signals, bold: true },
    { text: "Traditional total", fx: 9.4, v: trad[9].total, dy: -12, color: C.total, bold: true },
    { text: "Check cost", fx: 10.4, v: trad[10].checkCost, dy: -10, color: C.check },
    { text: "Fraud loss", fx: 3.8, v: traditional(3.8).fraudLoss, dy: 16, color: C.fraud },
  ];

  return (
    <section aria-label="Cost and risk trade-off" className="border-t border-ink bg-paper">
      <div className="grid gap-6 border-b border-ink py-8 md:grid-cols-[1fr_auto] md:items-end">
        <h2 className="display-lg">Cost per dealer per year</h2>
        <div className="flex w-fit border border-ink">
          <div className="border-r border-ink bg-brand p-3">
            <p className="tag-text">Total cost</p>
            <p className="figure text-4xl">−{h.totalReductionPct}%</p>
          </div>
          <div className="bg-paper p-3">
            <p className="tag-text">Portfolio / yr</p>
            <p className="figure text-4xl">{eurCompact(h.portfolioSavings)}</p>
            <p className="tag-text text-ash-700">saved · {ASSUMPTIONS.portfolioDealers} dealers</p>
          </div>
        </div>
      </div>

      <div className="py-8">
        {/* Legend: always present for >= 2 series */}
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="inline-block h-[3px] w-5" style={{ background: s.color }} aria-hidden />
              {s.label} <span className="text-ash-500">· {s.sub}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-[4px] w-5" style={{ background: C.signals }} aria-hidden />
            Total cost · Curb with signals
          </li>
        </ul>

        <div ref={ref} className="relative mt-4">
          <svg
            width={w}
            height={H}
            className="block touch-none select-none"
            role="img"
            aria-label={`Line chart. Traditional total cost is lowest at ${tMin.f} checks per year (${eur(tMin.total)}). Curb with signals is lowest at ${sMin.f} checks (${eur(sMin.total)}).`}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const k = Math.round(((e.clientX - r.left - L) / iw) * N);
              setHover(k < 0 || k > N ? null : k);
            }}
            onPointerLeave={() => setHover(null)}
            onClick={() => hover !== null && setF(hover)}
          >
            <defs>
              <clipPath id={clip}><rect x={L} y={T - 4} width={iw + 4} height={ih + 4} /></clipPath>
            </defs>
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={L} x2={L + iw} y1={y(t)} y2={y(t)} stroke={t ? "#e6eaf0" : "#0f1e33"} />
                <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#3d4858" className="tabular-nums">{t ? `€${t / 1000}k` : "€0"}</text>
              </g>
            ))}
            {trad.map((p) => (narrow && p.f % 2 ? null : (
              <text key={p.f} x={x(p.f)} y={H - 14} textAnchor="middle" fontSize="11" fill="#3d4858" className="tabular-nums">{p.f}</text>
            )))}
            <text x={L + iw} y={H - 1} textAnchor="end" fontSize="10" fill="#5f6b7a">scheduled physical checks per dealer per year</text>

            <g clipPath={`url(#${clip})`}>
              <path d={`${line(sig.map((p) => p.total))}L${x(N)},${y(0)}L${x(0)},${y(0)}Z`} fill={C.signals} opacity="0.1" />
              {SERIES.map((s) => (
                <path key={s.key} d={line(trad.map(s.get))} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              <path d={line(sig.map((p) => p.total))} fill="none" stroke={C.signals} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            </g>

            {/* off-chart value at f = 0 */}
            <g>
              <path d={`M${x(0) - 4},${T + 8} l4,-8 l4,8`} fill="none" stroke="#0f1e33" strokeWidth="1.2" />
              <text x={x(1) + 10} y={T + 10} fontSize="10" fill="#0f1e33" paintOrder="stroke" stroke="#fff" strokeWidth="4">← f=0: {eurCompact(trad[0].total)}, off scale</text>
            </g>

            {labels.map((l) => (
              <text key={l.text} x={x(l.fx)} y={y(l.v) + l.dy} fontSize="12" fontWeight={l.bold ? 700 : 500} fill="#0f1e33" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="4">
                {l.text}
              </text>
            ))}

            {/* slider marker */}
            <line x1={x(f)} x2={x(f)} y1={T} y2={T + ih} stroke="#0f1e33" strokeWidth="1" />
            <rect x={x(f) - 14} y={T + ih - 18} width="28" height="16" fill="#0f1e33" />
            <text x={x(f)} y={T + ih - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff">f={f}</text>

            {/* minima */}
            <MinDot cx={x(tMin.f)} cy={y(tMin.total)} color={C.total} label={`min ${eurCompact(tMin.total)}`} above />
            <MinDot cx={x(sMin.f)} cy={y(sMin.total)} color={C.signals} label={`min ${eurCompact(sMin.total)}`} />

            {/* hover crosshair */}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ih} stroke="#5f6b7a" strokeWidth="1" />
                {[...SERIES.map((s) => ({ c: s.color, v: s.get(trad[hover]) })), { c: C.signals, v: sig[hover].total }].map((d, i) =>
                  d.v <= yMax * 1.04 ? <circle key={i} cx={x(hover)} cy={y(d.v)} r="4.5" fill={d.c} stroke="#fff" strokeWidth="2" /> : null,
                )}
              </g>
            )}
          </svg>

          {hv && hover !== null && (
            <div
              className="pointer-events-none absolute top-4 z-10 w-56 border border-ink bg-paper p-3 text-xs"
              style={{ left: Math.min(Math.max(0, x(hover) + 12), w - 230) }}
            >
              <p className="tag-text">{hover} scheduled checks / yr</p>
              <TipRow c={C.check} k="Check cost" v={hv.t.checkCost} />
              <TipRow c={C.fraud} k="Fraud loss" v={hv.t.fraudLoss} />
              <TipRow c={C.total} k="Traditional total" v={hv.t.total} bold />
              <TipRow c={C.signals} k="Curb total" v={hv.s.total} bold />
              <p className="mt-1 text-ash-500">Click to pin</p>
            </div>
          )}
        </div>

        {/* Slider + readout */}
        <div className="mt-6 border border-ink">
          <label className="flex flex-wrap items-center gap-4 border-b border-ink p-4">
            <span className="tag-text">Scheduled checks / dealer / yr</span>
            <input
              type="range" min={0} max={N} step={1} value={f}
              onChange={(e) => setF(Number(e.target.value))}
              className="h-2 min-w-40 flex-1 cursor-pointer accent-[#1f4f9e]"
              aria-valuetext={`${f} checks per year`}
            />
            <span className="figure w-10 text-right text-3xl">{f}</span>
          </label>
          <div className="grid sm:grid-cols-2">
            <Readout title="Traditional" p={cur.t} accent="bg-paper" />
            <Readout title="Curb with signals" p={cur.s} accent="bg-brand-soft" border />
          </div>
          <p className="border-t border-ink p-4 text-sm tabular-nums">
            {ASSUMPTIONS.portfolioDealers} dealers at f = {f}: traditional <b>{eurCompact(cur.t.total * ASSUMPTIONS.portfolioDealers)}</b> / yr vs Curb <b>{eurCompact(cur.s.total * ASSUMPTIONS.portfolioDealers)}</b> / yr
            {cur.t.total > cur.s.total ? <> (<b>{eurCompact((cur.t.total - cur.s.total) * ASSUMPTIONS.portfolioDealers)}</b> less)</> : null}
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <details className="group border border-ink">
            <summary className="flex cursor-pointer items-center justify-between p-3 tag-text hover:bg-mist">
              <span>Assumptions</span>
              <span className="group-open:rotate-45 transition-transform" aria-hidden>+</span>
            </summary>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 border-t border-ink p-3 text-sm">
              {(Object.keys(ASSUMPTIONS) as (keyof typeof ASSUMPTIONS)[]).map((k) => (
                <div key={k} className="contents">
                  <dt className="border-b border-ash-100 py-1 text-ash-700">{A_LABELS[k][0]}</dt>
                  <dd className="border-b border-ash-100 py-1 text-right tabular-nums">{A_LABELS[k][1](ASSUMPTIONS[k])}</dd>
                </div>
              ))}
            </dl>
          </details>
          <details className="group border border-ink">
            <summary className="flex cursor-pointer items-center justify-between p-3 tag-text hover:bg-mist">
              <span>Data table</span>
              <span className="group-open:rotate-45 transition-transform" aria-hidden>+</span>
            </summary>
            <div className="overflow-x-auto border-t border-ink">
              <table className="w-full text-right text-xs tabular-nums">
                <thead className="tag-text text-ash-700">
                  <tr><th className="p-2 text-left font-normal">f</th><th className="p-2 font-normal">Check</th><th className="p-2 font-normal">Fraud</th><th className="p-2 font-normal">Total</th><th className="p-2 font-normal">Curb</th></tr>
                </thead>
                <tbody>
                  {trad.map((t, i) => (
                    <tr key={i} className={`border-t border-ash-100 ${i === f ? "bg-brand-soft" : ""}`}>
                      <td className="p-1.5 text-left">{t.f}</td><td className="p-1.5">{eur(t.checkCost)}</td><td className="p-1.5">{eur(t.fraudLoss)}</td><td className="p-1.5 font-semibold">{eur(t.total)}</td><td className="p-1.5 font-semibold">{eur(sig[i].total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

function MinDot({ cx, cy, color, label, above }: { cx: number; cy: number; color: string; label: string; above?: boolean }) {
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r="6" fill={color} stroke="#fff" strokeWidth="2" />
      <text x={cx} y={above ? cy - 12 : cy - 12} textAnchor={cx < 80 ? "start" : "middle"} dx={cx < 80 ? 8 : 0} fontSize="11" fontWeight="700" fill="#0f1e33" paintOrder="stroke" stroke="#fff" strokeWidth="4">
        {label}
      </text>
    </g>
  );
}

function TipRow({ c, k, v, bold }: { c: string; k: string; v: number; bold?: boolean }) {
  return (
    <p className={`mt-1 flex items-center justify-between gap-2 ${bold ? "font-semibold" : ""}`}>
      <span className="flex items-center gap-1.5"><span className="inline-block h-[3px] w-3" style={{ background: c }} />{k}</span>
      <span className="tabular-nums">{eur(v)}</span>
    </p>
  );
}

function Readout({ title, p, accent, border }: { title: string; p: CostPoint; accent: string; border?: boolean }) {
  return (
    <div className={`${accent} p-4 ${border ? "border-t border-ink sm:border-t-0 sm:border-l" : ""}`}>
      <p className="tag-text">{title}</p>
      <p className="mt-1 figure text-4xl">{eur(p.total)}</p>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 text-sm">
        <dt className="text-ash-700">Check cost</dt><dd className="text-right tabular-nums">{eur(p.checkCost)}</dd>
        <dt className="text-ash-700">Expected fraud loss</dt><dd className="text-right tabular-nums">{eur(p.fraudLoss)}</dd>
        <dt className="text-ash-700">Mean detection</dt><dd className="text-right tabular-nums">{p.detectionDays.toFixed(1)} days</dd>
      </dl>
    </div>
  );
}
