import { snapshot, subscribe } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-sent events: `rev` with the full state on connect and after every change.
 * Changes inside 150 ms are coalesced so a burst of actions sends one update.
 */
export async function GET(req: Request) {
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const send = () => {
        timer = undefined;
        try { controller.enqueue(enc.encode(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`)); } catch { cleanup(); }
      };
      send();
      const unsub = subscribe(() => { timer ??= setTimeout(send, 150); });
      const ping = setInterval(() => { try { controller.enqueue(enc.encode(`: ping\n\n`)); } catch { cleanup(); } }, 20_000);
      cleanup = () => { unsub(); clearInterval(ping); clearTimeout(timer); try { controller.close(); } catch { /* closed */ } };
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
