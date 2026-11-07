"use client";
import { ease, span } from "./Scene";

/**
 * The dealer's check-in for one car, side by side with what Curb checks.
 * Left: the phone. Three shots fill in as you scroll (VIN plate read by a scan
 * line, the car, the odometer rolling) and each gets a friendly "Got it".
 * Right: the silent checks the bank runs on those photos. They tick in step
 * with the chapter's four captions and never appear on the dealer's phone.
 */

const VIN = "KNADDTTF6NR212845";
const SANS = { fontFamily: "var(--font-sans)" };
const MONO = { fontFamily: "var(--font-mono)" };

// Phone capture phases (p ranges) and the moment each silent check ticks.
const VIN_SCAN: [number, number] = [0.05, 0.2];
const CAR_SHOT: [number, number] = [0.28, 0.42];
const ODO_ROLL: [number, number] = [0.53, 0.67];
const TICK = [0.21, 0.45, 0.7, 0.86];
const DONE = 0.88;

const CHECKS = [
  { label: "VIN matched", detail: "Same as on the loan, KNA…845" },
  { label: "On the lot, in the window", detail: "14:12, check-in open 13:00–15:00" },
  { label: "Odometer in line", detail: "+214 km since the last check-in" },
  { label: "New photo", detail: "No match with any earlier photo" },
];

// Phone geometry (viewBox 300 × 600).
const CX = 22, CW = 256, CH = 118, GAP = 8;
const CARD_Y = [104, 104 + CH + GAP, 104 + 2 * (CH + GAP)];

function Tick({ x, y, s = 1, color = "var(--color-go)" }: { x: number; y: number; s?: number; color?: string }) {
  return <path d={`M${x} ${y} l${4 * s} ${4 * s} l${8 * s} ${-9 * s}`} fill="none" stroke={color} strokeWidth={2 * Math.max(1, s * 0.8)} strokeLinecap="square" />;
}

function Card({ i, label, got, children }: { i: number; label: string; got: number; children: React.ReactNode }) {
  const y = CARD_Y[i];
  return (
    <g>
      <rect x={CX} y={y} width={CW} height={CH} fill="var(--color-mist)" stroke="var(--color-line)" />
      <text x={CX + 10} y={y + 17} fontSize={11} fill="var(--color-ash-500)" style={SANS}>
        <tspan className="figure">{i + 1}</tspan>  {label}
      </text>
      <g opacity={got} transform={`translate(${(1 - got) * 6} 0)`}>
        <Tick x={CX + CW - 61} y={y + 12} s={0.8} />
        <text x={CX + CW - 10} y={y + 17} fontSize={11} textAnchor="end" fill="var(--color-go)" fontWeight={500} style={SANS}>Got it</text>
      </g>
      {children}
    </g>
  );
}

/** Viewfinder corners framing the area while a shot is pending. */
function Brackets({ x, y, w, h, o }: { x: number; y: number; w: number; h: number; o: number }) {
  if (o <= 0) return null;
  const l = 10;
  return (
    <path
      d={`M${x} ${y + l}V${y}H${x + l}M${x + w - l} ${y}H${x + w}V${y + l}M${x + w} ${y + h - l}V${y + h}H${x + w - l}M${x + l} ${y + h}H${x}V${y + h - l}`}
      fill="none" stroke="var(--color-ink)" strokeWidth={1.5} opacity={o}
    />
  );
}

function VinShot({ p }: { p: number }) {
  const t = span(p, ...VIN_SCAN);
  const y = CARD_Y[0];
  const px = 46, pw = 208, py = y + 34, ph = 62;
  const step = 11.2, cx0 = px + (pw - step * 16) / 2;
  const scanX = px - 6 + (pw + 12) * t;
  const scanning = t > 0 && t < 1;
  return (
    <g>
      <rect x={px} y={py} width={pw} height={ph} fill="var(--color-silver)" stroke="var(--color-ash-300)" />
      {[[px + 7, py + 7], [px + pw - 7, py + 7], [px + 7, py + ph - 7], [px + pw - 7, py + ph - 7]].map(([a, b]) => (
        <circle key={`${a}-${b}`} cx={a} cy={b} r={2.2} fill="none" stroke="var(--color-ash-500)" strokeWidth={1} />
      ))}
      <text x={px + pw / 2} y={py + 20} fontSize={8.5} textAnchor="middle" fill="var(--color-ash-500)" style={SANS}>Vehicle identification no.</text>
      {VIN.split("").map((c, k) => {
        const x = cx0 + k * step;
        const read = scanX > x + 2;
        return (
          <text key={k} x={x} y={py + 44} fontSize={13.5} textAnchor="middle" fill={read ? "var(--color-ink)" : "var(--color-ash-300)"} fontWeight={read ? 600 : 400} style={MONO}>{c}</text>
        );
      })}
      {scanning && (
        <g>
          <rect x={scanX - 18} y={py - 6} width={18} height={ph + 12} fill="var(--color-lime)" opacity={0.55} />
          <line x1={scanX} x2={scanX} y1={py - 8} y2={py + ph + 8} stroke="var(--color-go)" strokeWidth={2} />
        </g>
      )}
      <Brackets x={px - 10} y={py - 10} w={pw + 20} h={ph + 20} o={1 - span(p, VIN_SCAN[1], VIN_SCAN[1] + 0.03)} />
    </g>
  );
}

// Side profile of a small crossover, drawn once as one path (nose to the right).
const CAR_BODY = "M74 88 L72 74 Q72 66 80 64 L104 60 L126 46 Q130 44 136 44 L184 44 Q192 44 198 50 L212 62 L230 66 Q238 68 238 76 L238 88";
const CAR_GLASS = "M110 60 L130 49 L158 49 L158 60 Z M164 49 L186 49 Q190 49 194 53 L204 61 L164 61 Z";
const CAR_LEN = 360;

function CarShot({ p }: { p: number }) {
  const t = ease(span(p, ...CAR_SHOT));
  const y = CARD_Y[1];
  const flash = span(p, CAR_SHOT[0], CAR_SHOT[0] + 0.02) * (1 - span(p, CAR_SHOT[0] + 0.02, CAR_SHOT[0] + 0.05));
  return (
    <g transform={`translate(0 ${y})`}>
      {/* ground */}
      <line x1={50} x2={250} y1={98} y2={98} stroke="var(--color-ash-300)" />
      {/* faint outline before the shot, ink once taken */}
      <path d={`${CAR_BODY} M238 88 L222 88 M196 88 L118 88 M92 88 L74 88`} fill="none" stroke="var(--color-ash-300)" strokeDasharray="3 3" />
      <path d={`${CAR_BODY} M238 88 L222 88 M196 88 L118 88 M92 88 L74 88`} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray={CAR_LEN} strokeDashoffset={CAR_LEN * (1 - t)} strokeLinejoin="round" />
      <path d={CAR_GLASS} fill="var(--color-brand)" opacity={t} />
      {[105, 209].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={88} r={12} fill={t > 0.5 ? "var(--color-ink)" : "none"} stroke={t > 0.5 ? "var(--color-ink)" : "var(--color-ash-300)"} strokeDasharray={t > 0.5 ? undefined : "3 3"} opacity={0.4 + 0.6 * t} />
          <circle cx={cx} cy={88} r={4.5} fill="var(--color-paper)" opacity={t} />
        </g>
      ))}
      <rect x={CX} y={0} width={CW} height={CH} fill="var(--color-paper)" opacity={flash * 0.9} />
      <Brackets x={60} y={34} w={190} h={72} o={1 - span(p, CAR_SHOT[1], CAR_SHOT[1] + 0.03)} />
    </g>
  );
}

const ODO_FROM = 47996, ODO_TO = 48210;

/** Continuous odometer wheel positions, least significant first: a wheel only turns while the wheels below it roll over. */
function wheels(v: number, n: number) {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const m = 10 ** i;
    const below = v % m;
    out.push((Math.floor(v / m) % 10) + Math.max(0, below - (m - 1)));
  }
  return out;
}

function OdoShot({ p }: { p: number }) {
  const t = ease(span(p, ...ODO_ROLL));
  const y = CARD_Y[2];
  const v = ODO_FROM + (ODO_TO - ODO_FROM) * t;
  const w = wheels(v, 5);
  const bx = 58, by = y + 38, bw = 184, bh = 50;
  const dw = 21, x0 = bx + 22;
  const xs = [0, 1, 2, 3, 4].map((k) => x0 + k * dw + (k >= 2 ? 9 : 0));
  return (
    <g>
      <defs>
        <clipPath id="ci-odo"><rect x={bx} y={by + 6} width={bw} height={bh - 12} /></clipPath>
      </defs>
      <rect x={bx} y={by} width={bw} height={bh} fill="var(--color-ink)" />
      <g clipPath="url(#ci-odo)">
        {xs.map((x, k) => {
          const pos = w[4 - k];
          const d = Math.floor(pos), f = pos - d;
          return (
            <g key={k} transform={`translate(0 ${-f * 30})`}>
              <text x={x + dw / 2 - 2} y={by + 35} fontSize={24} textAnchor="middle" fill="var(--color-paper)" style={MONO}>{d % 10}</text>
              <text x={x + dw / 2 - 2} y={by + 65} fontSize={24} textAnchor="middle" fill="var(--color-paper)" style={MONO}>{(d + 1) % 10}</text>
            </g>
          );
        })}
      </g>
      <text x={(xs[1] + xs[2] + dw) / 2 - 8} y={by + 36} fontSize={20} fill="var(--color-paper)" style={MONO}>,</text>
      <text x={bx + bw - 12} y={by + 34} fontSize={12} textAnchor="end" fill="var(--color-paper)" opacity={0.7} style={SANS}>km</text>
      <Brackets x={bx - 10} y={by - 10} w={bw + 20} h={bh + 20} o={1 - span(p, ODO_ROLL[1], ODO_ROLL[1] + 0.03)} />
    </g>
  );
}

const PROMPTS = ["Hold the phone to the VIN plate", "Now the whole car, from the side", "Last one: the odometer", "Sending"];

function Phone({ p }: { p: number }) {
  const got = [span(p, VIN_SCAN[1], VIN_SCAN[1] + 0.02), span(p, CAR_SHOT[1], CAR_SHOT[1] + 0.02), span(p, ODO_ROLL[1], ODO_ROLL[1] + 0.02)];
  const shots = got.filter((g) => g >= 1).length;
  const done = ease(span(p, DONE - 0.04, DONE));
  return (
    <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden>
      <rect x={1} y={1} width={298} height={598} rx={34} fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth={1.5} />
      <rect x={124} y={18} width={52} height={6} rx={3} fill="var(--color-ink)" />
      <text x={CX} y={52} fontSize={11} fill="var(--color-ash-500)" style={SANS}>Check-in · Laakso Autot</text>
      <text x={CX} y={74} fontSize={16} fill="var(--color-ink)" fontWeight={500} style={SANS}>Kia Niro EV · RKR-197</text>
      {[0, 1, 2].map((k) => (
        <rect key={k} x={CX + k * 87} y={86} width={82} height={4} fill={got[k] >= 1 ? "var(--color-ink)" : "var(--color-ash-100)"} />
      ))}
      <Card i={0} label="VIN plate" got={got[0]}><VinShot p={p} /></Card>
      <Card i={1} label="The car" got={got[1]}><CarShot p={p} /></Card>
      <Card i={2} label="Odometer" got={got[2]}><OdoShot p={p} /></Card>
      {/* bottom: prompt button, then the finished state */}
      <g opacity={1 - done}>
        <rect x={CX} y={492} width={CW} height={46} fill="var(--color-ink)" />
        <text x={150} y={520} fontSize={13} textAnchor="middle" fill="var(--color-paper)" style={SANS}>{PROMPTS[Math.min(3, shots)]}</text>
        <text x={150} y={560} fontSize={11} textAnchor="middle" fill="var(--color-ash-500)" style={SANS}><tspan className="figure">{shots}</tspan> of 3 photos</text>
      </g>
      <g opacity={done} transform={`translate(0 ${(1 - done) * 8})`}>
        <rect x={CX} y={480} width={CW} height={84} fill="var(--color-lime)" />
        <rect x={CX + 18} y={496} width={52} height={52} fill="var(--color-go)" />
        <Tick x={CX + 30} y={522} s={1.9} color="var(--color-paper)" />
        <text x={CX + 86} y={518} fontSize={18} fill="var(--color-ink)" fontWeight={600} style={SANS}>All verified</text>
        <text x={CX + 86} y={538} fontSize={11.5} fill="var(--color-ash-700)" style={SANS}>Thanks, that’s this car done</text>
      </g>
    </svg>
  );
}

function Status({ state }: { state: "wait" | "now" | "ok" }) {
  return (
    <svg viewBox="0 0 20 20" className="mt-px size-4 shrink-0 lg:size-5" aria-hidden>
      {state === "ok" ? (
        <>
          <rect x={0} y={0} width={20} height={20} fill="var(--color-go)" />
          <path d="M5 10.5 l3.5 3.5 l6.5 -7.5" fill="none" stroke="var(--color-paper)" strokeWidth={2} />
        </>
      ) : (
        <rect x={0.75} y={0.75} width={18.5} height={18.5} fill="none" stroke={state === "now" ? "var(--color-brand-deep)" : "var(--color-ash-300)"} strokeWidth={1.5} strokeDasharray={state === "now" ? "3 2" : undefined} />
      )}
    </svg>
  );
}

export function CheckIn({ p }: { p: number }) {
  const step = Math.min(3, Math.floor(p * 4 * 0.999));
  return (
    <div
      className="relative flex h-full w-full gap-3 pb-9 lg:items-center lg:gap-10 lg:pb-0"
      role="img"
      aria-label="A dealer's phone with three photos of a Kia Niro EV: VIN plate, car and odometer at 48,210 km, marked All verified. Beside it, the four checks Curb runs silently and never shows the dealer: VIN matched, taken on the lot inside the window, odometer in line, new photo."
    >
      <div className="flex aspect-[300/640] h-full max-h-[640px] shrink-0 flex-col">
        <p className="tag-text mb-2 text-ash-500">Dealer sees</p>
        <div className="min-h-0 flex-1"><Phone p={p} /></div>
      </div>
      <div className="min-w-0 flex-1 self-stretch border-l border-dashed border-ash-300 pl-3 lg:self-center lg:pl-8">
        <p className="tag-text text-ash-500">Curb sees</p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] leading-snug text-ash-500 lg:text-xs">
          <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" aria-hidden>
            <path d="M1.5 8 Q8 2 14.5 8 Q8 14 1.5 8Z" fill="none" stroke="currentColor" strokeWidth={1.2} />
            <circle cx={8} cy={8} r={2} fill="currentColor" />
            <line x1={2.5} y1={13.5} x2={13.5} y2={2.5} stroke="currentColor" strokeWidth={1.2} />
          </svg>
          <span>Silent. Never shown on the dealer’s phone.</span>
        </p>
        <ol className="mt-3 lg:mt-6">
          {CHECKS.map((c, i) => {
            const state = p >= TICK[i] ? "ok" : i === step ? "now" : "wait";
            return (
              <li key={c.label} className={`flex gap-2 border-t border-line py-2 transition-colors lg:gap-3 lg:py-3.5 ${state === "wait" ? "text-ash-500" : "text-ink"}`}>
                <Status state={state} />
                <div className="min-w-0">
                  <p className="text-[12px] leading-tight font-medium lg:text-base">{c.label}</p>
                  <p className={`mt-0.5 text-[10.5px] leading-snug lg:text-sm ${state === "ok" ? "text-ash-700" : "text-ash-300"}`}>{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
