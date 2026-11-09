"use client";
import { useEffect, useRef, useState } from "react";
import { ScanCar, buildCar } from "@/components/ui/ScanCar";

/**
 * The hero: a whole dealer lot as a point cloud. Points fly in and settle into
 * parked cars, then a scan ring spreads across the lot from the near corner.
 * Each car turns from grey to ink as it is read. One bay is empty: when the ring
 * reaches it, the car that should be there appears as a red ghost.
 * The camera follows the pointer and cranes up as the page scrolls.
 */

// Lot layout: double rows of cars nose to nose, bays side by side along z.
const SPINES = [0];
const BAYS = 5;
const BAY_W = 1.3;
const HALF_LOT_Z = (BAYS * BAY_W) / 2;
const GHOST = { spine: 0, side: 1, bay: 2 }; // the empty bay
const ORIGIN: [number, number] = [-5, 4.5]; // where the scan starts (x, z), near the camera

// Timeline, ms
const ASSEMBLE = 2600;
const SWEEP = 5200, HOLD = 2600, FADE = 900, CYCLE = SWEEP + HOLD + FADE;
const MAX_D = 13;

type V3 = [number, number, number];

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Interleaved: x y z | fx fy fz | kind seed. kind 0 body, 1 glass, 2 wheel, 3 ground, 4 paint, 5 ghost. */
function buildLot(mobile: boolean) {
  const car = buildCar();
  const r = rand(7);
  const out: number[] = [];
  const step = mobile ? 2 : 1;
  const scatter = (x: number, y: number, z: number): V3 => {
    const a = r() * Math.PI * 2, b = r() * 0.9 + 0.1, d = 3 + r() * 7;
    return [x * 0.4 + Math.cos(a) * d, y + 4 + b * d * 0.6, z * 0.4 + Math.sin(a) * d];
  };
  const add = (x: number, y: number, z: number, k: number) => {
    const [fx, fy, fz] = scatter(x, y, z);
    out.push(x, y, z, fx, fy, fz, k, r());
  };
  let ghost: V3 = [0, 0, 0];

  SPINES.forEach((sx, si) => {
    for (const side of [-1, 1]) {
      for (let b = 0; b < BAYS; b++) {
        const cz = -HALF_LOT_Z + BAY_W * (b + 0.5);
        const cx = sx + side * 1.18;
        const isGhost = si === GHOST.spine && side === GHOST.side && b === GHOST.bay;
        if (isGhost) ghost = [cx, 0.4, cz];
        // Nose to the spine for most cars; a few parked the other way round.
        const flip = 1;
        const yaw = (side < 0 ? 0 : Math.PI) + (flip < 0 ? Math.PI : 0) + (r() - 0.5) * 0.06;
        const c = Math.cos(yaw), s = Math.sin(yaw);
        const sc = 0.98 + r() * 0.06;
        // Thin the car by random keep, not by stride: the model pushes each point and its mirror
        // back to back, so a stride of 2 would keep one flank and drop the other.
        for (let i = 0; i < car.length; i += 4) {
          if (r() * step >= 1) continue;
          const x = car[i] * sc, y = car[i + 1] * sc, z = car[i + 2] * sc;
          add(cx + x * c - z * s, y, cz + x * s + z * c, isGhost ? 5 : car[i + 3]);
        }
      }
      // Painted bay lines on this side of the spine.
      for (let b = 0; b <= BAYS; b++) {
        const z = -HALF_LOT_Z + BAY_W * b;
        for (let t = 0.2; t <= 2.3; t += 0.09) add(sx + side * t, 0, z, 4);
      }
    }
  });

  // Ground: a dot grid that carries the scan ring.
  const G = mobile ? 0.5 : 0.4;
  for (let x = -7; x <= 7; x += G) for (let z = -6; z <= 6; z += G) add(x + (r() - 0.5) * 0.05, 0, z + (r() - 0.5) * 0.05, 3);

  return { data: new Float32Array(out), ghost };
}

const VERT = `
attribute vec3 aPos;
attribute vec3 aFrom;
attribute vec2 aMeta;
uniform mat4 uMVP;
uniform float uAssemble;
uniform float uWave;
uniform float uFade;
uniform float uTime;
uniform vec2 uOrigin;
uniform float uSize;
uniform float uFocal;
varying vec4 vCol;

const vec3 INK = vec3(0.059, 0.118, 0.2);
const vec3 ASH = vec3(0.6, 0.64, 0.69);
const vec3 GO = vec3(0.118, 0.478, 0.31);
const vec3 LIME = vec3(0.45, 0.78, 0.6);
const vec3 BLUE = vec3(0.2, 0.36, 0.62);
const vec3 HIGH = vec3(0.76, 0.231, 0.18);
const vec3 LINE = vec3(0.78, 0.81, 0.86);

void main() {
  float kind = aMeta.x;
  float seed = aMeta.y;
  float d = distance(aPos.xz, uOrigin);

  // Fly in from the scattered cloud, nearer points first.
  float delay = seed * 0.35 + d / 24.0 * 0.45;
  float k = clamp((uAssemble - delay) / 0.55, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - k, 4.0);
  vec3 p = mix(aFrom, aPos, e);
  // a little drift while in flight
  p += vec3(sin(seed * 40.0 + uTime * 0.9), cos(seed * 23.0 + uTime * 0.7), sin(seed * 11.0 + uTime)) * 0.15 * (1.0 - e);

  float front = uWave - d;                     // > 0 once the ring has passed
  float band = exp(-front * front * 3.2);      // bright edge of the ring
  float passed = step(0.0, front);

  vec3 col; float a; float size = 1.0;
  if (kind < 2.5) {
    vec3 done = kind < 0.5 ? INK : (kind < 1.5 ? BLUE : INK);
    col = mix(ASH, done, passed * uFade);
    a = mix(0.42, 0.9, passed * uFade);
    col = mix(col, GO, band);
    a = max(a, band);
    size = kind > 1.5 ? 0.85 : 1.0;
    size *= 1.0 + band * 1.1;
  } else if (kind < 3.5) {
    col = mix(LINE, LIME, band);
    a = (0.4 + band * 0.6) * smoothstep(6.5, 2.5, length(aPos.xz));
    size = 0.8 + band * 1.6;
  } else if (kind < 4.5) {
    col = mix(ASH, GO, band);
    a = 0.4 + band * 0.5;
    size = 0.7;
  } else {
    // The missing car: only there once the scan has looked for it.
    float flick = 0.75 + 0.25 * sin(uTime * 7.0 + seed * 30.0);
    col = HIGH;
    a = passed * uFade * flick + band * 0.5;
    size = 1.15;
  }
  a *= mix(0.55, 1.0, e);

  gl_Position = uMVP * vec4(p, 1.0);
  float w = gl_Position.w;
  a *= smoothstep(30.0, 8.0, w);              // fog with distance
  gl_PointSize = max(1.0, uSize * size * uFocal / w);
  vCol = vec4(col, a);
}`;

const FRAG = `
precision mediump float;
varying vec4 vCol;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c);
  if (r > 0.25) discard;
  gl_FragColor = vec4(vCol.rgb, vCol.a * smoothstep(0.25, 0.12, r));
}`;

// --- small matrix kit (column-major) ---
function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function lookAt(e: V3, t: V3): Float32Array {
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const z = norm(sub(e, t)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
}
function mul(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
    o[i * 4 + j] = s;
  }
  return o;
}

export function HeroLot({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current, box = wrap.current, tag = tagRef.current;
    if (!canvas || !box || !tag) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, alpha: true });
    if (!gl) { setFallback(true); return; }

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { data, ghost } = buildLot(mobile);
    const count = data.length / 8;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setFallback(true); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 32, offset * 4);
    };
    attr("aPos", 3, 0); attr("aFrom", 3, 3); attr("aMeta", 2, 6);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uMVP = U("uMVP"), uAssemble = U("uAssemble"), uWave = U("uWave"), uFade = U("uFade"), uTime = U("uTime"), uOrigin = U("uOrigin"), uSize = U("uSize"), uFocal = U("uFocal");
    gl.uniform2f(uOrigin, ORIGIN[0], ORIGIN[1]);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(ASSEMBLE + SWEEP + 100); });
    ro.observe(canvas);

    // Pointer and scroll steer the camera, eased.
    const aim = { x: 0, y: 0, s: 0 }, cam = { x: 0, y: 0, s: 0 };
    const onMove = (e: PointerEvent) => { aim.x = e.clientX / innerWidth - 0.5; aim.y = e.clientY / innerHeight - 0.5; };
    const onScroll = () => { aim.s = Math.min(1, Math.max(0, scrollY / Math.max(1, box.offsetHeight))); };
    if (!reduce) { addEventListener("pointermove", onMove, { passive: true }); addEventListener("scroll", onScroll, { passive: true }); }
    onScroll();

    const ghostTop: V3 = [ghost[0], ghost[1] + 0.55, ghost[2]];
    const ghostD = Math.hypot(ghost[0] - ORIGIN[0], ghost[2] - ORIGIN[1]);

    function draw(t: number) {
      if (!gl) return;
      for (const k of ["x", "y", "s"] as const) cam[k] += (aim[k] - cam[k]) * (reduce ? 1 : 0.05);
      const assemble = Math.min(1.4, t / ASSEMBLE);
      const tc = Math.max(0, t - ASSEMBLE * 0.8);
      const cyc = reduce ? SWEEP + 1 : tc % CYCLE;
      const wave = cyc < SWEEP ? (cyc / SWEEP) * MAX_D : MAX_D + 4;
      const fade = cyc > SWEEP + HOLD ? 1 - (cyc - SWEEP - HOLD) / FADE : 1;
      const firstPass = !reduce && tc < 1;

      // A slow orbit, nudged by the pointer, rising with scroll.
      const ang = -1.12 + (reduce ? 0 : Math.sin(t * 0.00006) * 0.12) + cam.x * 0.35;
      const radius = (mobile ? 15 : 13) + cam.s * 3;
      const height = 6 + cam.s * 5 - cam.y * 2;
      const target: V3 = [0, 0, 0];
      const eye: V3 = [target[0] + Math.sin(ang) * radius, height, target[2] + Math.cos(ang) * radius];
      const aspect = W / Math.max(1, H);
      const fov = mobile ? 0.82 : 0.62;
      // Shift the lot on screen: to the right of the title on desktop, above it on phones.
      const shift = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, mobile ? 0.05 : 0.46, mobile ? 0.16 : 0.12, 0, 1]);
      const mvp = mul(shift, mul(perspective(fov, aspect, 0.1, 80), lookAt(eye, target)));
      const focal = Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniformMatrix4fv(uMVP, false, mvp);
      gl.uniform1f(uAssemble, firstPass ? 0 : assemble);
      gl.uniform1f(uWave, wave);
      gl.uniform1f(uFade, Math.max(0, fade));
      gl.uniform1f(uTime, t / 1000);
      gl.uniform1f(uSize, (mobile ? 1.8 : 2.0) * dpr);
      gl.uniform1f(uFocal, focal);
      gl.drawArrays(gl.POINTS, 0, count);

      // Pin the tag to the empty bay once the scan has reached it.
      const [x, y, z] = ghostTop;
      const cx = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
      const cy = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
      const cw = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
      const sx = (cx / cw * 0.5 + 0.5) * W, sy = (1 - (cy / cw * 0.5 + 0.5)) * H;
      const shown = assemble >= 1 && wave > ghostD + 0.4 ? Math.max(0, fade) : 0;
      tag!.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      tag!.style.opacity = String(shown);
    }

    if (reduce) { draw(ASSEMBLE + SWEEP + 100); return () => ro.disconnect(); }

    let raf = 0, visible = true;
    const t0 = performance.now();
    const loop = (now: number) => { draw(now - t0); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => {
      stop(); io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      removeEventListener("pointermove", onMove); removeEventListener("scroll", onScroll);
    };
  }, []);

  if (fallback) return <ScanCar scale={0.4} className={className} title="A car turning in its bay while a scan passes over it" />;

  return (
    <div ref={wrap} className={`pointer-events-none ${className}`}>
      <canvas ref={canvasRef} role="img" aria-label="A row of parked cars drawn in points. A scan spreads across it, reading each car; one bay is empty." className="absolute inset-0 h-full w-full" />
      <div ref={tagRef} aria-hidden className="absolute top-0 left-0 opacity-0 transition-opacity duration-500 will-change-transform">
        <div className="-translate-x-1/2 -translate-y-full pb-3">
          <div className="flex flex-col items-center">
            <span className="bg-high px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-paper">Not on the floor</span>
            <span className="h-8 w-px bg-high" />
          </div>
        </div>
      </div>
    </div>
  );
}
