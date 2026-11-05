import { NextResponse } from "next/server";
import { apply, snapshot } from "@/server/db";
import { ActionError, CLIENT_OPS, type ClientOp } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { op, args } → runs one engine action. Answers { rev, result, state }. */
export async function POST(req: Request) {
  let body: { op?: unknown; args?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }
  const { op, args = [] } = body;
  if (typeof op !== "string" || !(CLIENT_OPS as readonly string[]).includes(op) || !Array.isArray(args)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  try {
    const { result } = apply(op as ClientOp, args);
    return NextResponse.json({ ...snapshot(), result: result ?? null });
  } catch (e) {
    if (e instanceof ActionError || e instanceof TypeError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
