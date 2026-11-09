/**
 * Server-side photo checks. Runs only in the route handler, never in the dealer's browser, so the
 * dealer can't change a result. The context (expected VIN and plate, geofence, window, last
 * odometer, earlier photo hashes) comes from the server's own state, never from the request.
 *
 * The AI photo model reads the VIN, plate, odometer, the one-time code, and the car's make and colour,
 * and flags photos of a screen or printout: Claude vision when ANTHROPIC_API_KEY is set and the photos
 * come from a real camera; otherwise (or if the call fails) a simulated read with the same shape.
 *
 * A clear mismatch is a fail. When the model is unsure, the car is marked "needs a look" for a person
 * instead: a low-confidence read never fails a check on its own.
 */
import sharp from "sharp";
import { compareVin } from "@/lib/vin";
import { locateOnLot, type Position } from "@/lib/engine";
import type { CheckInWindow, Geofence, PhotoCheck, ShotKind } from "@/lib/types";
import { readShotsWithClaude, visionEnabled, type VisionRead } from "./vision";

export const SHOT_KINDS: ShotKind[] = ["vin", "car", "odometer"];

export interface CheckContext {
  requestedVin: string;
  expectedPlate: string;
  /** One-time code shown at Start (self-checks only). */
  expectedCode?: string;
  expectedMake: string;
  expectedColor: string;
  /** Uploader's IP and its rough (simulated) area. Information only. */
  ip?: { address: string; area: string };
  lastKnownOdometerKm: number | null;
  geofence: Geofence;
  window?: CheckInWindow;
  /** Phone position at each shot, in shot order; null when location was unavailable. */
  positions: (Position | null)[];
  capture: "camera" | "simulated";
  /** Perceptual hashes of every earlier photo. */
  earlierHashes: string[];
  /** Demo helpers. */
  simulateOnSite: boolean;
  forceUnreadable: boolean;
}

/** Re-uploads of the same photo land at 0–4 bits; different plates on the same label template measured 12–26. */
const DUPLICATE_BITS = 6;
/** An in-stock car shouldn't gain more than this between check-ins. */
const MAX_PLAUSIBLE_KM = 500;

/** dHash (difference hash), 256 bits, from a 17×16 greyscale thumbnail. */
async function dHash(img: Buffer): Promise<string> {
  const W = 17, H = 16;
  const px = await sharp(img).rotate().resize(W, H, { fit: "fill" }).greyscale().raw().toBuffer();
  let bits = "";
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) bits += px[y * W + x] > px[y * W + x + 1] ? "1" : "0";
  return BigInt("0b" + bits).toString(16).padStart(64, "0");
}

export const thumbnail = (img: Buffer) => sharp(img).rotate().resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();

function hamming(a: string, b: string): number {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b), n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

const normPlate = (p: string | null) => (p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Loose match for make and colour ("Dark grey" vs "grey", "VW" stays a mismatch): unknown counts as a match. */
function sameWords(read: string | null, expected: string): boolean {
  if (!read) return true;
  const a = read.toLowerCase(), b = expected.toLowerCase();
  return a.includes(b) || b.includes(a) || a.split(/\s+/).some((w) => w.length > 2 && b.split(/\s+/).includes(w));
}

/** Rough area of an IP address. A mock: a real build would call a geo-IP service. */
export function ipArea(address: string): string {
  if (!address || address === "unknown") return "Unknown";
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|::ffff:127\.)/i.test(address)) return "Local network (demo)";
  return "Finland, approximate (simulated lookup)";
}

/** Stand-in odometer for cars with no earlier reading, stable per VIN. */
const baseOdometer = (vin: string) => 8000 + ([...vin].reduce((s, c) => s + c.charCodeAt(0) * 131, 0) % 90000);

async function simulatedRead(ctx: CheckContext): Promise<VisionRead> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
  const last = ctx.lastKnownOdometerKm ?? baseOdometer(ctx.requestedVin);
  return {
    vin: ctx.requestedVin, confidence: 0.94 + Math.random() * 0.05, plate: ctx.expectedPlate, odometerKm: last + Math.round(Math.random() * 40),
    code: ctx.expectedCode ?? null, make: ctx.expectedMake, color: ctx.expectedColor, fakeSuspected: false,
  };
}

async function read(shots: Record<ShotKind, Buffer>, ctx: CheckContext): Promise<{ read: VisionRead; reader: "claude" | "simulated" }> {
  if (ctx.forceUnreadable) return { read: { vin: null, confidence: 0.2, plate: ctx.expectedPlate, odometerKm: null, code: null, make: ctx.expectedMake, color: ctx.expectedColor, fakeSuspected: false }, reader: "simulated" };
  if (visionEnabled() && ctx.capture === "camera") {
    try {
      return { read: await readShotsWithClaude(shots, { expectedPlateCountry: "Finland" }), reader: "claude" };
    } catch (e) {
      console.warn(`[photo-checks] vision read failed, using simulated read: ${(e as Error).message}`);
    }
  }
  return { read: await simulatedRead(ctx), reader: "simulated" };
}

export interface CheckOutput { check: PhotoCheck; hashes: string[]; thumbs: Record<ShotKind, Buffer> }

export async function checkShots(shots: Record<ShotKind, Buffer>, ctx: CheckContext): Promise<CheckOutput> {
  const receivedAt = new Date();
  const [hashes, thumbList, { read: r, reader }] = await Promise.all([
    Promise.all(SHOT_KINDS.map((k) => dHash(shots[k]))),
    Promise.all(SHOT_KINDS.map((k) => thumbnail(shots[k]))),
    read(shots, ctx),
  ]);

  // Reuse: against every earlier photo, and the three shots against each other.
  let nearest = 256;
  hashes.forEach((h, i) => {
    for (const e of ctx.earlierHashes) nearest = Math.min(nearest, hamming(e, h));
    for (let j = 0; j < i; j++) nearest = Math.min(nearest, hamming(hashes[j], h));
  });
  const duplicate = nearest <= DUPLICATE_BITS;

  const vinMatch = compareVin(ctx.requestedVin, r.vin);
  const plateMatch = !!r.plate && normPlate(r.plate) === normPlate(ctx.expectedPlate);
  const last = ctx.lastKnownOdometerKm;
  const delta = r.odometerKm !== null && last !== null ? r.odometerKm - last : null;
  const plausible = r.odometerKm !== null && (delta === null || (delta >= 0 && delta <= MAX_PLAUSIBLE_KM));

  const location = locateOnLot(ctx.geofence, ctx.positions, ctx.simulateOnSite);
  const insideWindow = ctx.window
    ? receivedAt >= new Date(new Date(ctx.window.start).getTime() - 15 * 60_000) && receivedAt <= new Date(ctx.window.end)
    : true;

  const code = ctx.expectedCode ? { expected: ctx.expectedCode, read: r.code, match: r.code === ctx.expectedCode } : undefined;
  const expectedCar = `${ctx.expectedMake} · ${ctx.expectedColor}`;
  const carRead = r.make || r.color ? `${r.make ?? "?"} · ${r.color ?? "?"}` : null;
  const carMatch = { expected: expectedCar, read: carRead, match: sameWords(r.make, ctx.expectedMake) && sameWords(r.color, ctx.expectedColor) };

  // Unsure reads go to a person instead of failing.
  const needsLook: string[] = [];
  if (vinMatch === "unreadable") needsLook.push("VIN not readable");
  else if (r.confidence < 0.6) needsLook.push("low confidence in the VIN read");
  if (!r.plate) needsLook.push("plate not readable");
  if (r.odometerKm === null) needsLook.push("odometer not readable");
  if (code && !code.read) needsLook.push("code not visible");
  if (r.make && r.color && !carMatch.match) needsLook.push(`car looks like ${carRead}, loan says ${expectedCar}`);
  if (r.fakeSuspected) needsLook.push("may be a photo of a screen or a printout");

  // Clear mismatches fail.
  const hardOk = vinMatch !== "mismatch" && (plateMatch || !r.plate) && !(code && code.read && !code.match)
    && (plausible || r.odometerKm === null) && !!location?.inside && insideWindow && !duplicate;
  const verified = hardOk && needsLook.length === 0;

  return {
    hashes,
    thumbs: { vin: thumbList[0], car: thumbList[1], odometer: thumbList[2] },
    check: {
      vin: ctx.requestedVin,
      readVin: r.vin,
      confidence: +r.confidence.toFixed(2),
      vinMatch,
      plate: { expected: ctx.expectedPlate, read: r.plate, match: plateMatch },
      odometer: { readKm: r.odometerKm, lastKnownKm: last, deltaKm: delta, plausible },
      capture: ctx.capture,
      reader,
      location,
      freshness: { receivedAt: receivedAt.toISOString(), insideWindow },
      reuse: { hash: hashes[0], nearestDistance: nearest, duplicate },
      code,
      carMatch,
      fakeSuspected: r.fakeSuspected,
      needsLook: needsLook.length ? needsLook : undefined,
      ip: ctx.ip,
      verified,
    },
  };
}
