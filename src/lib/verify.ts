"use client";
/**
 * Client side of the photo checks: capture context and send the three shots to the server.
 * All checks run in /api/check-photo (src/server/photoChecks.ts), so the browser can't change a result.
 */
import type { Car, CheckInWindow, DemoState, Geofence, PhotoCheck, ShotKind } from "./types";

export type Shots = Record<ShotKind, Blob>;
export type Fix = { lat: number; lng: number; accuracy: number } | null;

export function getPosition(timeoutMs = 5000): Promise<Fix> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}

/** Latest odometer we know for a car: connected-car feed, else the newest photo reading. */
export function lastOdometer(s: DemoState, vin: string): number | null {
  const feed = s.feeds.connected[vin]?.odometerKm;
  if (feed !== undefined) return feed;
  let best: { at: string; km: number } | null = null;
  const consider = (r: PhotoCheck | undefined) => {
    const km = r?.odometer?.readKm;
    if (r && km != null && (!best || r.freshness.receivedAt > best.at)) best = { at: r.freshness.receivedAt, km };
  };
  for (const ci of s.checkIns) { const r = ci.results[vin]; if (r && !("skipped" in r)) consider(r); }
  for (const v of s.spotChecks) { const r = v.results[vin]; if (r?.status === "found") consider(r.photo); }
  return (best as { km: number } | null)?.km ?? null;
}

export async function submitShots(opts: {
  shots: Shots;
  positions: Fix[];
  simulated: boolean;
  car: Car;
  geofence: Geofence;
  lastKnownOdometerKm: number | null;
  window?: CheckInWindow;
  simulateOnSite: boolean;
  forceUnreadable: boolean;
}): Promise<PhotoCheck> {
  const form = new FormData();
  for (const [k, b] of Object.entries(opts.shots)) form.append(k, b, `${k}.jpg`);
  form.append("context", JSON.stringify({
    requestedVin: opts.car.vin,
    expectedPlate: opts.car.plate,
    lastKnownOdometerKm: opts.lastKnownOdometerKm,
    geofence: opts.geofence,
    window: opts.window,
    positions: opts.positions,
    capture: opts.simulated ? "simulated" : "camera",
    simulateOnSite: opts.simulateOnSite,
    forceUnreadable: opts.forceUnreadable,
  }));
  const res = await fetch("/api/check-photo", { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Check failed (${res.status})`);
  return res.json();
}

/** Demo reset: clear the server's photo-reuse index too. */
export const resetServerChecks = () => fetch("/api/check-photo", { method: "DELETE" }).catch(() => undefined);
