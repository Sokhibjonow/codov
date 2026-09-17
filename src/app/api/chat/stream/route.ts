import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { subscribe } from "@/lib/chat/bus";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;
// Proxies such as Cloudflare hold back small chunks; a comment this size pushes the stream through
const PADDING = `: ${" ".repeat(4096)}\n\n`;

/** Live chat events for the signed-in user (Server-Sent Events). */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      // Reconnect quickly after the server restarts or the network drops
      send(`retry: 3000\n\ndata: ${JSON.stringify({ type: "hello" })}\n\n${PADDING}`);
      // Every event carries padding too, so it isn't held back waiting for more data
      const unsubscribe = subscribe(user.id, (event) => send(`data: ${JSON.stringify(event)}\n\n${PADDING}`));
      // Keeps proxies (Cloudflare, nginx) from closing an idle connection
      const heartbeat = setInterval(() => send(PADDING), HEARTBEAT_MS);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
