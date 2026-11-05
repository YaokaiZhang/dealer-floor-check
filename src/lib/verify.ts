"use client";
/**
 * Client side of the photo checks: capture context and send the three shots to the server.
 * All checks run in /api/check-photo (src/server/photoChecks.ts), so the browser can't change a result.
 * The browser sends only the photos, the phone positions and which check and car they belong to.
 */
import type { PhotoCheck, ShotKind } from "./types";
import { acceptSnapshot } from "./store";

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

/** Sends one car's three shots. The server looks up the rest, runs the checks and records the result. */
export async function submitShots(opts: {
  job: "check_in" | "spot_check";
  id: string;
  carVin: string;
  shots: Shots;
  positions: Fix[];
  simulated: boolean;
}): Promise<PhotoCheck> {
  const form = new FormData();
  for (const [k, b] of Object.entries(opts.shots)) form.append(k, b, `${k}.jpg`);
  form.append("meta", JSON.stringify({ job: opts.job, id: opts.id, carVin: opts.carVin, positions: opts.positions, capture: opts.simulated ? "simulated" : "camera" }));
  const res = await fetch("/api/check-photo", { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Check failed (${res.status})`);
  const { check, rev, state } = await res.json();
  acceptSnapshot({ rev, state });
  return check;
}
