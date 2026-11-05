import { NextResponse } from "next/server";
import { reset, snapshot } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full demo state and its revision. */
export async function GET() {
  return NextResponse.json(snapshot(), { headers: { "cache-control": "no-store" } });
}

/** Demo reset to seed data (also forgets earlier photos). */
export async function DELETE() {
  reset();
  return NextResponse.json(snapshot());
}
