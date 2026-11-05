import { readPhoto } from "@/server/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const img = readPhoto((await params).id);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=31536000, immutable" } });
}
