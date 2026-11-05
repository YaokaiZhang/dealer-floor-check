"use client";
/**
 * Silent photo checks. FRONTEND PHASE: the VIN read is simulated here.
 * Swap `readVin` for a call to the vision API route later; everything else is real.
 */
import type { CheckInWindow, Dealer, PhotoCheck } from "./types";
import { compareVin } from "./vin";
import { distanceM } from "./geo";

/** dHash (difference hash), 256 bits, computed in the browser from a 17×16 greyscale thumbnail. */
const HW = 17, HH = 16;
async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

export async function dHashAndThumb(file: Blob): Promise<{ hash: string; thumbnail: string }> {
  const bmp = await loadBitmap(file);
  const c = document.createElement("canvas");
  c.width = HW; c.height = HH;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, HW, HH);
  const px = ctx.getImageData(0, 0, HW, HH).data;
  const g = (x: number, y: number) => { const i = (y * HW + x) * 4; return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114; };
  let bits = "";
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW - 1; x++) bits += g(x, y) > g(x + 1, y) ? "1" : "0";
  const hash = BigInt("0b" + bits).toString(16).padStart(64, "0");

  const t = document.createElement("canvas");
  const w = 240, h = Math.round((240 * bmp.height) / bmp.width) || 160;
  t.width = w; t.height = h;
  t.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return { hash, thumbnail: t.toDataURL("image/jpeg", 0.6) };
}

export function hamming(a: string, b: string): number {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b), n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

export function getPosition(timeoutMs = 5000): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 });
  });
}

/** Simulated vision call. Returns strict `{vin, confidence}` like the real model will. */
async function readVin(_file: Blob, requestedVin: string, forceUnreadable: boolean): Promise<{ vin: string | null; confidence: number }> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
  if (forceUnreadable) return { vin: null, confidence: 0.2 };
  return { vin: requestedVin, confidence: 0.94 + Math.random() * 0.05 };
}

export async function runSilentChecks(opts: {
  file: Blob;
  requestedVin: string;
  dealer: Dealer;
  window?: CheckInWindow;
  earlierHashes: { hash: string }[];
  position: GeolocationPosition | null;
  simulateOnSite: boolean;
  forceUnreadable: boolean;
}): Promise<PhotoCheck> {
  const [{ hash, thumbnail }, read] = await Promise.all([
    dHashAndThumb(opts.file),
    readVin(opts.file, opts.requestedVin, opts.forceUnreadable),
  ]);
  const vinMatch = compareVin(opts.requestedVin, read.vin);

  const g = opts.dealer.geofence;
  let location: PhotoCheck["location"] = null;
  if (opts.position) {
    const p = { lat: opts.position.coords.latitude, lng: opts.position.coords.longitude };
    const d = distanceM(p, g);
    location = { ...p, accuracyM: Math.round(opts.position.coords.accuracy), distanceM: Math.round(d), inside: d <= g.radiusM + Math.min(opts.position.coords.accuracy, 150), simulated: false };
  }
  if ((!location || !location.inside) && opts.simulateOnSite) {
    // Demo fallback (e.g. on stage in Helsinki): place the phone on the dealer lot and label it as simulated.
    const jitter = () => (Math.random() - 0.5) * 0.002;
    const p = { lat: g.lat + jitter(), lng: g.lng + jitter() };
    location = { ...p, accuracyM: 12, distanceM: Math.round(distanceM(p, g)), inside: true, simulated: true };
  }

  const receivedAt = new Date();
  const insideWindow = opts.window
    ? receivedAt >= new Date(new Date(opts.window.start).getTime() - 15 * 60_000) && receivedAt <= new Date(opts.window.end)
    : true;

  const nearest = opts.earlierHashes.reduce((m, h) => Math.min(m, hamming(h.hash, hash)), 256);
  // Re-uploads of the same photo land at 0–4 bits; different plates on the same label template measured 12–26.
  const duplicate = nearest <= 6;

  const verified = (vinMatch === "exact" || vinMatch === "ocr_tolerant") && !!location?.inside && insideWindow && !duplicate;
  return {
    vin: opts.requestedVin,
    readVin: read.vin,
    confidence: +read.confidence.toFixed(2),
    vinMatch,
    location,
    freshness: { receivedAt: receivedAt.toISOString(), insideWindow },
    reuse: { hash, nearestDistance: nearest, duplicate },
    verified,
    thumbnail,
  };
}
