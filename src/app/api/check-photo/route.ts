import { NextResponse } from "next/server";
import { checkShots, ipArea, SHOT_KINDS, type CheckContext } from "@/server/photoChecks";
import { apply, savePhoto, snapshot } from "@/server/db";
import { ActionError, lastOdometer, type Position } from "@/lib/engine";
import type { ShotKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const uid = () => Math.random().toString(36).slice(2, 12);

function positionsOf(raw: unknown): (Position | null)[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, SHOT_KINDS.length).map((p) => {
    const q = p as Position | null;
    return q && Number.isFinite(q.lat) && Number.isFinite(q.lng) ? { lat: +q.lat, lng: +q.lng, accuracy: Number.isFinite(q.accuracy) ? +q.accuracy : 999 } : null;
  });
}

/**
 * POST multipart: `vin`, `car`, `odometer` image files plus a JSON `meta`:
 * { job: "check_in" | "spot_check", id, carVin, positions, capture }.
 * The server looks up everything else, runs the checks, records the result and answers { check, rev, state }.
 */
export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 }); }

  let meta: { job: "check_in" | "spot_check"; id: string; carVin: string; positions: unknown; capture: unknown };
  try {
    meta = JSON.parse(String(form.get("meta")));
    if ((meta.job !== "check_in" && meta.job !== "spot_check") || typeof meta.id !== "string" || typeof meta.carVin !== "string") throw new Error();
  } catch {
    return NextResponse.json({ error: "Missing photo metadata" }, { status: 400 });
  }

  const shots = {} as Record<ShotKind, Buffer>;
  for (const k of SHOT_KINDS) {
    const f = form.get(k);
    if (!(f instanceof Blob) || !f.type.startsWith("image/") || f.size === 0 || f.size > MAX_BYTES) {
      return NextResponse.json({ error: `Missing or invalid ${k} photo` }, { status: 400 });
    }
    shots[k] = Buffer.from(await f.arrayBuffer());
  }

  // Context from the server's own records.
  const { state: s } = snapshot();
  const job = meta.job === "check_in" ? s.checkIns.find((c) => c.id === meta.id) : s.spotChecks.find((v) => v.id === meta.id);
  const car = s.cars.find((c) => c.vin === meta.carVin);
  const dealer = job && s.dealers.find((d) => d.id === job.dealerId);
  if (!job || !car || !dealer || !job.sampledVins.includes(car.vin)) return NextResponse.json({ error: "Unknown check or car" }, { status: 404 });

  const address = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
  const ctx: CheckContext = {
    requestedVin: car.vin,
    expectedPlate: car.plate,
    expectedCode: "code" in job ? job.code : undefined,
    expectedMake: car.make,
    expectedColor: car.color,
    ip: { address, area: ipArea(address) },
    lastKnownOdometerKm: lastOdometer(s, car.vin),
    geofence: dealer.geofence,
    window: "window" in job ? job.window : undefined,
    positions: positionsOf(meta.positions),
    capture: meta.capture === "simulated" ? "simulated" : "camera",
    earlierHashes: s.photoHashes.map((h) => h.hash),
    simulateOnSite: s.flags.simulateOnSite,
    forceUnreadable: s.flags.nextPhotoUnreadable,
  };

  let out;
  try { out = await checkShots(shots, ctx); } catch { return NextResponse.json({ error: "Could not read the photos" }, { status: 422 }); }

  const base = uid();
  const urls = {} as Record<ShotKind, string>;
  for (const k of SHOT_KINDS) { savePhoto(`${base}-${k}`, out.thumbs[k]); urls[k] = `/api/photos/${base}-${k}`; }
  const check = { ...out.check, thumbnail: urls.vin, thumbnails: urls };

  try {
    apply(meta.job === "check_in" ? "recordPhoto" : "recordVisitPhoto", [job.id, car.vin, check, out.hashes]);
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
  // The new state rides along so the phone shows the result without waiting for the stream.
  return NextResponse.json({ check, ...snapshot() });
}
