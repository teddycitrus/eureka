import { bus } from "@/lib/events";
import { limit, retryAfterSec } from "@/lib/rate-limit";
import { clientIp, hashId } from "@/lib/auth";

export const dynamic = "force-dynamic";
// On Vercel, function maxDuration tops out at 60s (Hobby) / 300s (Pro). The
// client EventSource will auto-reconnect; we still hand the connection back
// to the runtime well before the cap so we don't get killed mid-frame.
export const maxDuration = 60;

/**
 * GET /api/stream
 * Server-Sent Events stream of Iris-internal events. The /lanes globe view
 * subscribes here and re-fetches /api/globe on relevant signals.
 */
export async function GET(req: Request) {
  // Cheap per-IP throttle so a stuck client can't open thousands of sockets.
  const rl = await limit(hashId(clientIp(req)), {
    bucket: "stream:connect",
    windowSec: 60,
    max: 20,
  });
  if (!rl.ok) {
    return new Response(
      `: too many connections\n\n`,
      {
        status: 429,
        headers: {
          "Content-Type": "text/event-stream",
          "Retry-After": String(retryAfterSec(rl)),
        },
      },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          /* controller already closed */
        }
      };

      send("hello", { ok: true, ts: Date.now() });

      const unsubscribe = bus.subscribe((evt) => send(evt.type, evt));

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* noop */
        }
      }, 25_000);

      // Soft close at 50s so the runtime doesn't shoot us — client reconnects.
      const softClose = setTimeout(() => cleanup(), 50_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(softClose);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}
