/**
 * Server-side photo checks. Runs only in the Next.js route handler, never in the dealer's browser,
 * so the dealer can't change a result. Timestamps come from the server clock and the photo-reuse
 * index lives on the server.
 *
 * FRONTEND PHASE:
 *  - The VIN, licence plate and odometer reads are simulated. Swap `readShot` for the vision API.
 *  - The demo has no database, so the browser sends the check-in context (geofence, window, expected
 *    plate, last odometer). In production the server loads it from its own records by check-in id.
 *  - The reuse index is in memory: it resets when the server restarts.
 */
import sharp from "sharp";
import { compareVin } from "@/lib/vin";
import { distanceM } from "@/lib/geo";
import type { CheckInWindow, Geofence, PhotoCheck, ShotKind } from "@/lib/types";

export const SHOT_KINDS: ShotKind[] = ["vin", "car", "odometer"];

export interface Position { lat: number; lng: number; accuracy: number }

export interface CheckContext {
  requestedVin: string;
  expectedPlate: string;
  lastKnownOdometerKm: number | null;
  geofence: Geofence;
  window?: CheckInWindow;
  /** Phone position at each shot, in shot order; null when location was unavailable. */
  positions: (Position | null)[];
  capture: "camera" | "simulated";
  /** Demo helpers. */
  simulateOnSite: boolean;
  forceUnreadable: boolean;
}

/** Re-uploads of the same photo land at 0–4 bits; different plates on the same label template measured 12–26. */
const DUPLICATE_BITS = 6;
/** An in-stock car shouldn't gain more than this between check-ins. */
const MAX_PLAUSIBLE_KM = 500;

type Index = { hash: string; vin: string; at: string }[];
const g = globalThis as unknown as { __photoIndex?: Index };
const index = (): Index => (g.__photoIndex ??= []);
export const clearPhotoIndex = () => { g.__photoIndex = []; };

/** dHash (difference hash), 256 bits, from a 17×16 greyscale thumbnail. */
async function dHash(img: Buffer): Promise<string> {
  const W = 17, H = 16;
  const px = await sharp(img).rotate().resize(W, H, { fit: "fill" }).greyscale().raw().toBuffer();
  let bits = "";
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) bits += px[y * W + x] > px[y * W + x + 1] ? "1" : "0";
  return BigInt("0b" + bits).toString(16).padStart(64, "0");
}

async function thumbnail(img: Buffer): Promise<string> {
  const jpg = await sharp(img).rotate().resize({ width: 240 }).jpeg({ quality: 60 }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

function hamming(a: string, b: string): number {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b), n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

const normPlate = (p: string | null) => (p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Stand-in odometer for cars with no earlier reading, stable per VIN. */
const baseOdometer = (vin: string) => 8000 + ([...vin].reduce((s, c) => s + c.charCodeAt(0) * 131, 0) % 90000);

/** Simulated vision reads. Return the strict shape the real model will. */
async function readShots(ctx: CheckContext): Promise<{ vin: string | null; confidence: number; plate: string | null; odometerKm: number | null }> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
  if (ctx.forceUnreadable) return { vin: null, confidence: 0.2, plate: ctx.expectedPlate, odometerKm: null };
  const last = ctx.lastKnownOdometerKm ?? baseOdometer(ctx.requestedVin);
  return {
    vin: ctx.requestedVin,
    confidence: 0.94 + Math.random() * 0.05,
    plate: ctx.expectedPlate,
    odometerKm: last + Math.round(Math.random() * 40),
  };
}

function locate(ctx: CheckContext): PhotoCheck["location"] {
  const f = ctx.geofence;
  const fixes = ctx.positions.filter((p): p is Position => !!p);
  let location: PhotoCheck["location"] = null;
  // Every shot must be on the lot (with up to 150 m GPS slack); report the farthest one.
  if (fixes.length === ctx.positions.length && fixes.length > 0) {
    const worst = fixes
      .map((p) => ({ p, d: distanceM(p, f) }))
      .reduce((m, x) => (x.d - Math.min(x.p.accuracy, 150) > m.d - Math.min(m.p.accuracy, 150) ? x : m));
    location = {
      lat: worst.p.lat, lng: worst.p.lng, accuracyM: Math.round(worst.p.accuracy), distanceM: Math.round(worst.d),
      inside: worst.d <= f.radiusM + Math.min(worst.p.accuracy, 150), simulated: false,
    };
  }
  if ((!location || !location.inside) && ctx.simulateOnSite) {
    // Demo fallback (e.g. on stage in Helsinki): place the phone on the dealer lot and label it as simulated.
    const jitter = () => (Math.random() - 0.5) * 0.002;
    const p = { lat: f.lat + jitter(), lng: f.lng + jitter() };
    location = { ...p, accuracyM: 12, distanceM: Math.round(distanceM(p, f)), inside: true, simulated: true };
  }
  return location;
}

export async function checkShots(shots: Record<ShotKind, Buffer>, ctx: CheckContext): Promise<PhotoCheck> {
  const receivedAt = new Date();
  const [hashes, thumbs, read] = await Promise.all([
    Promise.all(SHOT_KINDS.map((k) => dHash(shots[k]))),
    Promise.all(SHOT_KINDS.map((k) => thumbnail(shots[k]))),
    readShots(ctx),
  ]);

  // Reuse: against every earlier photo, and the three shots against each other.
  const earlier = index();
  let nearest = 256;
  hashes.forEach((h, i) => {
    for (const e of earlier) nearest = Math.min(nearest, hamming(e.hash, h));
    for (let j = 0; j < i; j++) nearest = Math.min(nearest, hamming(hashes[j], h));
  });
  const duplicate = nearest <= DUPLICATE_BITS;
  for (const h of hashes) earlier.push({ hash: h, vin: ctx.requestedVin, at: receivedAt.toISOString() });

  const vinMatch = compareVin(ctx.requestedVin, read.vin);
  const plateMatch = !!read.plate && normPlate(read.plate) === normPlate(ctx.expectedPlate);
  const last = ctx.lastKnownOdometerKm;
  const delta = read.odometerKm !== null && last !== null ? read.odometerKm - last : null;
  const plausible = read.odometerKm !== null && (delta === null || (delta >= 0 && delta <= MAX_PLAUSIBLE_KM));

  const location = locate(ctx);
  const insideWindow = ctx.window
    ? receivedAt >= new Date(new Date(ctx.window.start).getTime() - 15 * 60_000) && receivedAt <= new Date(ctx.window.end)
    : true;

  const verified = (vinMatch === "exact" || vinMatch === "ocr_tolerant") && plateMatch && plausible && !!location?.inside && insideWindow && !duplicate;

  return {
    vin: ctx.requestedVin,
    readVin: read.vin,
    confidence: +read.confidence.toFixed(2),
    vinMatch,
    plate: { expected: ctx.expectedPlate, read: read.plate, match: plateMatch },
    odometer: { readKm: read.odometerKm, lastKnownKm: last, deltaKm: delta, plausible },
    capture: ctx.capture,
    location,
    freshness: { receivedAt: receivedAt.toISOString(), insideWindow },
    reuse: { hash: hashes[0], nearestDistance: nearest, duplicate },
    verified,
    thumbnail: thumbs[0],
    thumbnails: { vin: thumbs[0], car: thumbs[1], odometer: thumbs[2] },
  };
}
