import { NextResponse } from "next/server";
import { checkShots, clearPhotoIndex, SHOT_KINDS, type CheckContext } from "@/server/photoChecks";
import type { ShotKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

/** POST multipart: `vin`, `car`, `odometer` image files plus a JSON `context`. Returns a PhotoCheck. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  let ctx: CheckContext;
  try {
    ctx = JSON.parse(String(form.get("context")));
    if (!ctx?.requestedVin || !ctx.geofence) throw new Error();
  } catch {
    return NextResponse.json({ error: "Missing check context" }, { status: 400 });
  }
  const shots = {} as Record<ShotKind, Buffer>;
  for (const k of SHOT_KINDS) {
    const f = form.get(k);
    if (!(f instanceof Blob) || !f.type.startsWith("image/") || f.size === 0 || f.size > MAX_BYTES) {
      return NextResponse.json({ error: `Missing or invalid ${k} photo` }, { status: 400 });
    }
    shots[k] = Buffer.from(await f.arrayBuffer());
  }
  try {
    return NextResponse.json(await checkShots(shots, ctx));
  } catch {
    return NextResponse.json({ error: "Could not read the photos" }, { status: 422 });
  }
}

/** Demo reset: forget earlier photos. */
export async function DELETE() {
  clearPhotoIndex();
  return new NextResponse(null, { status: 204 });
}
