"use client";
/**
 * In-app camera, three shots per car: VIN plate, whole car with licence plate, odometer.
 * Live camera only: there is no file picker, so nothing can come from the photo gallery.
 * On a device without a usable camera the demo can fall back to a labelled, simulated camera.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getPosition, type Fix, type Shots } from "@/lib/verify";
import type { Car, ShotKind } from "@/lib/types";

const STEPS: { id: ShotKind; label: string; short: string; noun: string }[] = [
  { id: "vin", label: "VIN plate", short: "VIN", noun: "VIN plate" },
  { id: "car", label: "Whole car, plate in view", short: "Car", noun: "the car" },
  { id: "odometer", label: "Odometer, ignition on", short: "Odometer", noun: "odometer" },
];

/** Where VIN plates usually are, by make. Purely a finding aid. */
function vinHint(make: string): string {
  const m = make.toLowerCase();
  if (["tesla", "volvo", "polestar"].includes(m)) return "Windscreen on the driver's side, or the door pillar";
  return "Bottom of the windscreen, or the driver's door pillar";
}

type Mode = "starting" | "live" | "error" | "demo";

/** Once the presenter picks the demo camera, keep it for the next cars in this page session. */
let preferDemo = false;

export function ShotSequence({ car, allowDemo, onDone }: {
  car: Car;
  allowDemo: boolean;
  onDone: (shots: Shots, positions: Fix[], simulated: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>("starting");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [taken, setTaken] = useState<Partial<Record<ShotKind, { blob: Blob; url: string; pos: Promise<Fix> }>>>({});
  const [flash, setFlash] = useState(false);

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };

  const start = useCallback(async () => {
    setMode("starting");
    if (!window.isSecureContext) { setError("The camera needs a secure (https) connection."); setMode("error"); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setError("This browser can't open the camera."); setMode("error"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
      stop();
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => undefined); }
      setMode("live");
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(name === "NotAllowedError" ? "Camera access is blocked. Allow it in the browser and retry." : name === "NotFoundError" ? "No camera found on this device." : "The camera couldn't start.");
      setMode("error");
    }
  }, []);

  const useDemo = () => { stop(); preferDemo = true; setMode("demo"); };
  const useReal = () => { preferDemo = false; void start(); };

  useEffect(() => {
    if (allowDemo && preferDemo) setMode("demo");
    else void start();
    return stop;
  }, [start, allowDemo]);

  // Revoke preview URLs on unmount.
  const takenRef = useRef(taken);
  takenRef.current = taken;
  useEffect(() => () => Object.values(takenRef.current).forEach((t) => t && URL.revokeObjectURL(t.url)), []);

  const kind = STEPS[Math.min(step, STEPS.length - 1)].id;

  // Demo camera: draw a fresh simulated frame for each step.
  useEffect(() => {
    if (mode === "demo" && previewRef.current) drawSimulated(previewRef.current, kind, car);
  }, [mode, kind, car]);

  const grab = async (): Promise<Blob | null> => {
    const c = document.createElement("canvas");
    if (mode === "live") {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return null;
      const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    } else if (mode === "demo" && previewRef.current) {
      c.width = previewRef.current.width;
      c.height = previewRef.current.height;
      c.getContext("2d")!.drawImage(previewRef.current, 0, 0);
    } else return null;
    return new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
  };

  const shoot = async () => {
    const pos = getPosition();
    const blob = await grab();
    if (!blob) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    const next = { ...taken, [kind]: { blob, url: URL.createObjectURL(blob), pos } };
    setTaken(next);
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    const simulated = mode === "demo";
    stop();
    setStep(STEPS.length);
    const positions = await Promise.all(STEPS.map((s) => next[s.id]!.pos));
    onDone({ vin: next.vin!.blob, car: next.car!.blob, odometer: next.odometer!.blob }, positions, simulated);
  };

  const back = () => {
    const prev = STEPS[step - 1].id;
    const t = taken[prev];
    if (t) URL.revokeObjectURL(t.url);
    setTaken((x) => { const y = { ...x }; delete y[prev]; return y; });
    setStep(step - 1);
  };

  const ready = mode === "live" || mode === "demo";

  return (
    <div>
      <ol className="grid grid-cols-3 border border-ink" aria-label="Photos for this car">
        {STEPS.map((s, i) => {
          const t = taken[s.id];
          return (
            <li key={s.id} aria-current={i === step ? "step" : undefined}
              className={`flex min-h-14 min-w-0 items-center justify-center gap-2 px-1.5 py-1.5 text-center tag-text transition-colors duration-200 ${i > 0 ? "border-l border-ink" : ""} ${i === step ? "bg-ink text-paper" : t ? "bg-lime" : "text-ash-700"}`}>
              {t
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.url} alt="" className="size-8 shrink-0 border border-ink object-cover animate-pop" />
                : <span className="flex size-6 shrink-0 items-center justify-center border border-current">{i + 1}</span>}
              <span className="min-w-0 truncate">{s.short}</span>
            </li>
          );
        })}
      </ol>

      <div className="relative mt-3 aspect-[4/3] overflow-hidden border border-ink bg-ink">
        <video ref={videoRef} playsInline muted autoPlay className={`absolute inset-0 size-full object-cover ${mode === "live" ? "" : "hidden"}`} />
        <canvas ref={previewRef} width={1280} height={960} className={`absolute inset-0 size-full object-cover ${mode === "demo" ? "" : "hidden"}`} />
        {ready && step < STEPS.length && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-6 border-2 border-dashed border-paper/70" />
            <span className="absolute top-3 left-3 bg-paper px-2 py-1 tag-text text-ink">{STEPS[step].label}</span>
            {mode === "demo" && <span className="absolute top-3 right-3 bg-brand px-2 py-1 tag-text text-ink">Simulated</span>}
          </>
        )}
        {mode === "starting" && <p className="absolute inset-0 flex items-center justify-center text-sm text-paper">Opening camera…</p>}
        {mode === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-mist p-4 text-center">
            <p className="text-sm font-medium">{error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" className="min-h-11" onClick={() => void start()}>Retry</Button>
              {allowDemo && <Button variant="primary" className="min-h-11" onClick={useDemo}>Use demo camera</Button>}
            </div>
          </div>
        )}
        {flash && <span aria-hidden className="absolute inset-0 bg-paper/80" />}
      </div>

      {(step === 0 || (allowDemo && (mode === "live" || mode === "demo"))) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-sm text-ash-700">
          <p>{step === 0 ? vinHint(car.make) : ""}</p>
          {allowDemo && mode === "live" && <button type="button" onClick={useDemo} className="-my-2 min-h-11 shrink-0 underline underline-offset-4">Demo camera</button>}
          {allowDemo && mode === "demo" && <button type="button" onClick={useReal} className="-my-2 min-h-11 shrink-0 underline underline-offset-4">Real camera</button>}
        </div>
      )}

      <button
        type="button"
        onClick={() => void shoot()}
        disabled={!ready || step >= STEPS.length}
        className="mt-3 flex min-h-[4.5rem] w-full items-center justify-center gap-3 border border-ink bg-ink px-4 py-4 text-paper transition-[transform,box-shadow] duration-150 hover:shadow-[3px_3px_0_0_var(--color-brand)] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="28" height="28" viewBox="0 0 30 30" fill="none" aria-hidden>
          <path d="M4 9h5l2-3h8l2 3h5v15H4z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="15" cy="16" r="4.5" stroke="#c4ff0d" strokeWidth="1.6" />
        </svg>
        <span className="display-md">Photograph {STEPS[Math.min(step, STEPS.length - 1)].noun}</span>
      </button>
      {step > 0 && step < STEPS.length && (
        <button type="button" onClick={back} className="mt-2 min-h-11 w-full text-sm font-medium text-ash-700 underline underline-offset-4">
          Retake {STEPS[step - 1].noun}
        </button>
      )}
    </div>
  );
}

/** A clearly labelled stand-in frame. Random shapes keep every frame unique for the reuse check. */
function drawSimulated(c: HTMLCanvasElement, kind: ShotKind, car: Car) {
  const x = c.getContext("2d")!;
  const W = c.width, H = c.height, r = Math.random;
  const hue = Math.floor(r() * 360);
  const g = x.createLinearGradient(0, 0, W * r(), H);
  g.addColorStop(0, `hsl(${hue} 25% 70%)`);
  g.addColorStop(1, `hsl(${(hue + 60 + r() * 120) % 360} 30% 35%)`);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) {
    x.fillStyle = `hsl(${Math.floor(r() * 360)} 35% ${30 + r() * 50}% / 0.6)`;
    x.fillRect(r() * W, r() * H, 120 + r() * 420, 80 + r() * 320);
  }
  x.textAlign = "center";
  x.textBaseline = "middle";
  if (kind === "vin") {
    x.fillStyle = "#f4f4f4"; x.fillRect(W * 0.12, H * 0.38, W * 0.76, H * 0.24);
    x.strokeStyle = "#000"; x.lineWidth = 4; x.strokeRect(W * 0.12, H * 0.38, W * 0.76, H * 0.24);
    x.fillStyle = "#000"; x.font = "600 64px monospace"; x.fillText(car.vin, W / 2, H / 2);
  } else if (kind === "car") {
    x.fillStyle = "#1d1d1d";
    x.beginPath(); x.roundRect(W * 0.12, H * 0.38, W * 0.76, H * 0.32, 60); x.fill();
    x.beginPath(); x.roundRect(W * 0.26, H * 0.24, W * 0.48, H * 0.2, 40); x.fill();
    x.fillStyle = "#fff"; x.fillRect(W * 0.38, H * 0.56, W * 0.24, H * 0.09);
    x.strokeStyle = "#000"; x.lineWidth = 3; x.strokeRect(W * 0.38, H * 0.56, W * 0.24, H * 0.09);
    x.fillStyle = "#000"; x.font = "700 56px monospace"; x.fillText(car.plate, W / 2, H * 0.605);
  } else {
    x.fillStyle = "#0b0b0b"; x.beginPath(); x.roundRect(W * 0.2, H * 0.3, W * 0.6, H * 0.4, 30); x.fill();
    x.fillStyle = "#c4ff0d"; x.font = "600 96px monospace";
    x.fillText(`${String(Math.floor(10000 + r() * 90000)).padStart(6, "0")} km`, W / 2, H / 2);
  }
  x.fillStyle = "rgba(0,0,0,0.6)"; x.fillRect(0, H - 56, W, 56);
  x.fillStyle = "#fff"; x.font = "500 28px monospace";
  x.fillText(`SIMULATED CAMERA · ${new Date().toISOString().slice(11, 19)}`, W / 2, H - 28);
}
