"use client";
import { useEffect, useRef } from "react";

/**
 * A car as a point cloud, turning slowly in its parking bay while a scan plane
 * sweeps from bumper to bumper. Points are grey until the plane crosses them,
 * then take the "verified" colour; plate, VIN and odometer are read as it passes.
 */

type Tone = "light" | "dark";
type Callout = { x: number; y: number; z: number; label?: string; value: string };

const lerp = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    if (x <= x1) {
      const [x0, y0] = pts[i - 1];
      const k = (x - x0) / (x1 - x0);
      const e = k * k * (3 - 2 * k); // smooth the silhouette between keyframes
      return y0 + (y1 - y0) * e;
    }
  }
  return pts[pts.length - 1][1];
};

// Side profile of a hatchback-ish sedan, x from rear (-1) to front (+1); y up; half width.
const TOP: [number, number][] = [[-1, 0.3], [-0.96, 0.41], [-0.8, 0.45], [-0.5, 0.67], [0.1, 0.69], [0.48, 0.46], [0.94, 0.39], [1, 0.3]];
const BELT: [number, number][] = [[-1, 0.41], [-0.6, 0.46], [0.4, 0.46], [1, 0.39]];
const BOT: [number, number][] = [[-1, 0.15], [-0.9, 0.09], [0.9, 0.09], [1, 0.15]];
const HALF: [number, number][] = [[-1, 0.36], [-0.85, 0.42], [0.8, 0.42], [1, 0.36]];
const WHEELS: [number, number][] = [[-0.6, 0.155], [0.62, 0.155]];
const WHEEL_R = 0.15;

/** Cross-section outline at x: (z, y, kind) points walked from the sill, over the roof, to the centre line. */
function section(x: number) {
  const top = lerp(TOP, x), bot = lerp(BOT, x), w = lerp(HALF, x);
  const belt = Math.min(top, lerp(BELT, x));
  const glass = top > belt + 0.03;
  const wr = w * 0.72;
  const pts: [number, number][] = [[w * 0.86, bot], [w, bot + 0.06], [w, belt - 0.04], [w * 0.97, belt]];
  if (glass) pts.push([wr, top - 0.02], [wr * 0.85, top], [0, top]);
  else pts.push([w * 0.7, top], [0, top]);
  return { pts, belt, glass };
}

/** Point on the outline at fraction u (0 = sill, 1 = centre of the roof). */
function along(x: number, u: number): [number, number, number] {
  const { pts, belt } = section(x);
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = u * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, d / lens[i]) : 0;
      const z = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
      const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
      return [z, y, y > belt + 0.02 ? 1 : 0];
    }
    d -= lens[i];
  }
  return [0, 0, 0];
}

/** kind: 0 body, 1 glass, 2 wheel */
export function buildCar() {
  const out: number[] = [];
  const inArch = (x: number, y: number) => WHEELS.some(([wx, wy]) => Math.hypot(x - wx, y - wy) < WHEEL_R + 0.035);
  const push = (x: number, y: number, z: number, k: number) => {
    if (Math.abs(z) > lerp(HALF, x) * 0.8 && inArch(x, y)) return; // open wheel arches
    out.push(x, y, z, k);
    if (z > 0.001) out.push(x, y, -z, k);
  };
  // Contour lines running bumper to bumper, like a scanner's sweep lines.
  const U = 15;
  for (let j = 0; j <= U; j++) {
    for (let x = -1; x <= 1.0001; x += 0.022) {
      const [z, y, k] = along(x, j / U);
      push(x, y, z, k);
    }
  }
  // A few ribs across the body.
  for (let i = 0; i <= 12; i++) {
    const x = -0.98 + (1.96 * i) / 12;
    for (let u = 0; u <= 1.0001; u += 0.035) {
      const [z, y, k] = along(x, u);
      push(x, y, z, k);
    }
  }
  // Nose and tail faces.
  for (const x of [-1, 1]) {
    const w = lerp(HALF, x), top = lerp(TOP, x), bot = lerp(BOT, x);
    for (let y = bot; y <= top; y += 0.045) for (let z = 0; z <= w * 0.9; z += 0.05) push(x, y, z, 0);
  }
  // Wheels: tyre walls and rims.
  for (const [wx, wy] of WHEELS) {
    const zw = lerp(HALF, wx) - 0.03;
    for (const side of [-1, 1]) {
      for (const [zOff, r, n] of [[0, WHEEL_R, 30], [0, WHEEL_R * 0.78, 24], [0.1, WHEEL_R, 30], [0, 0.05, 8]] as const) {
        for (let j = 0; j < n; j++) {
          const a = (j / n) * Math.PI * 2;
          out.push(wx + Math.cos(a) * r, wy + Math.sin(a) * r, side * (zw - zOff), 2);
        }
      }
      for (let j = 0; j < 5; j++) { // spokes
        const a = (j / 5) * Math.PI * 2;
        for (let r = 0.06; r < WHEEL_R * 0.78; r += 0.022) out.push(wx + Math.cos(a) * r, wy + Math.sin(a) * r, side * zw, 2);
      }
    }
  }
  return new Float32Array(out);
}

const PALETTE: Record<Tone, { done: string; pending: string; glow: string; glass: string; plane: string; line: string; label: string; value: string; bay: string }> = {
  light: { done: "15,30,51", pending: "95,107,122", glow: "30,122,79", glass: "31,79,158", plane: "182,224,203", line: "30,122,79", label: "#5f6b7a", value: "#0f1e33", bay: "15,30,51" },
  dark: { done: "255,255,255", pending: "195,203,214", glow: "182,224,203", glass: "219,229,242", plane: "182,224,203", line: "182,224,203", label: "rgba(255,255,255,0.6)", value: "#ffffff", bay: "255,255,255" },
};

export function ScanCar({
  tone = "light",
  callouts,
  className = "",
  scale = 0.36,
  tilt = 0.32,
  title = "A car being scanned in its parking bay",
}: {
  tone?: Tone;
  /** Readings shown as the scan passes. Omit for none. */
  callouts?: Callout[];
  className?: string;
  /** Car length as a share of the canvas width. */
  scale?: number;
  /** Camera elevation, radians. */
  tilt?: number;
  /** Accessible name; pass "" when the canvas is decoration next to its own text. */
  title?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const calloutsRef = useRef(callouts);
  calloutsRef.current = callouts;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const car = buildCar();
    const C = PALETTE[tone];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const mono = css.getPropertyValue("--font-mono-face").trim() || "ui-monospace, monospace";
    const sans = css.getPropertyValue("--font-body").trim() || "ui-sans-serif, sans-serif";

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const SWEEP = 3400, HOLD = 1800, FADE = 500, CYCLE = SWEEP + HOLD + FADE;
    const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // Sway between the two three-quarter views rather than spinning to an end-on view.
      const theta = reduce ? 0.7 : 0.2 + 0.8 * Math.sin(now * 0.00028 + 1);
      const cyc = reduce ? SWEEP + 1 : now % CYCLE;
      const scanX = cyc < SWEEP ? -1.2 + (cyc / SWEEP) * 2.4 : 1.3;
      const fade = cyc > SWEEP + HOLD ? 1 - (cyc - SWEEP - HOLD) / FADE : 1;
      const S = Math.min(W * scale, H * 0.62) ; // half-length in px
      const cx = W / 2, cy = H * 0.56;
      const cosR = Math.cos(theta), sinR = Math.sin(theta);

      const project = (x: number, y: number, z: number) => {
        const xr = x * cosR + z * sinR;
        const zr = -x * sinR + z * cosR;
        const yc = y - 0.34;
        const yt = yc * cosT - zr * sinT;
        const zt = yc * sinT + zr * cosT;
        const p = 4 / (4 + zt);
        return { X: cx + xr * S * p, Y: cy - yt * S * p, p, depth: zt };
      };

      // The parking bay: painted lines on the ground, open at the front.
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(${C.bay},0.22)`;
      const bay: [number, number][] = [[1.35, -0.78], [-1.3, -0.78], [-1.3, 0.78], [1.35, 0.78]];
      ctx.beginPath();
      bay.forEach(([x, z], i) => { const q = project(x, 0, z); if (i) ctx.lineTo(q.X, q.Y); else ctx.moveTo(q.X, q.Y); });
      ctx.stroke();

      // Points
      for (let i = 0; i < car.length; i += 4) {
        const x = car[i], y = car[i + 1], z = car[i + 2], k = car[i + 3];
        const q = project(x, y, z);
        const d = Math.max(0.28, Math.min(1, 0.68 - q.depth * 0.55));
        const dx = x - scanX;
        let color: string, a: number, size = (k === 2 ? 1.5 : 1.7) * q.p;
        if (Math.abs(dx) < 0.07) { color = C.glow; a = 1; size *= 1.9; }
        else if (dx < 0) { color = k === 1 ? C.glass : C.done; a = d * fade + (1 - fade) * d * 0.35; }
        else { color = C.pending; a = d * 0.62; }
        ctx.fillStyle = `rgba(${color},${a.toFixed(3)})`;
        ctx.fillRect(q.X - size / 2, q.Y - size / 2, size, size);
      }

      // Scan plane
      if (cyc < SWEEP) {
        const corners = [[0.02, -0.6], [0.84, -0.6], [0.84, 0.6], [0.02, 0.6]].map(([y, z]) => project(scanX, y, z));
        ctx.beginPath();
        corners.forEach((q, i) => (i ? ctx.lineTo(q.X, q.Y) : ctx.moveTo(q.X, q.Y)));
        ctx.closePath();
        ctx.fillStyle = `rgba(${C.plane},${tone === "light" ? 0.28 : 0.14})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${C.line},0.9)`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // Readings
      const list = calloutsRef.current;
      if (list?.length) {
        ctx.textBaseline = "alphabetic";
        list.forEach((c, i) => {
          if (scanX < c.x) return;
          const since = cyc < SWEEP ? (scanX - c.x) / 0.25 : 1;
          const alpha = Math.min(1, since) * fade;
          if (alpha <= 0) return;
          const q = project(c.x, c.y, c.z);
          const right = i % 2 === 0;
          const lx = q.X + (right ? 1 : -1) * Math.max(36, S * 0.22);
          const ly = q.Y - Math.max(40, S * 0.3) - (i === 2 ? S * 0.16 : 0);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = `rgba(${C.line},1)`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(q.X, q.Y); ctx.lineTo(lx, ly); ctx.lineTo(lx + (right ? 14 : -14), ly); ctx.stroke();
          ctx.fillStyle = `rgba(${C.line},1)`;
          ctx.fillRect(q.X - 2.5, q.Y - 2.5, 5, 5);
          const fs = Math.max(11, Math.min(14, S * 0.05));
          ctx.textAlign = right ? "left" : "right";
          ctx.font = `500 ${fs * 1.08}px ${mono}`;
          const tw = ctx.measureText(`${c.value}  ✓`).width;
          // Keep the reading inside the canvas on narrow screens.
          const tx = right ? Math.min(lx + 20, W - 6 - tw) : Math.max(lx - 20, 6 + tw);
          ctx.font = `500 ${fs}px ${sans}`;
          ctx.fillStyle = C.label;
          if (c.label) ctx.fillText(c.label, tx, ly - fs * 0.35);
          ctx.font = `500 ${fs * 1.08}px ${mono}`;
          ctx.fillStyle = C.value;
          ctx.fillText(`${c.value}  ✓`, tx, ly + fs * 1.05);
          ctx.globalAlpha = 1;
        });
      }
    };

    let raf = 0, visible = true;
    const t0 = performance.now();
    const loop = (t: number) => { draw(t - t0); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    if (reduce) {
      draw(0);
      ro.disconnect();
      const ro2 = new ResizeObserver(() => { resize(); draw(0); });
      ro2.observe(canvas);
      return () => ro2.disconnect();
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => { stop(); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [tone, scale, tilt]);

  return title ? <canvas ref={ref} role="img" aria-label={title} className={className} /> : <canvas ref={ref} aria-hidden className={className} />;
}
