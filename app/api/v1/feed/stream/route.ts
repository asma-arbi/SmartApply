import { connectDB } from "@/server/lib/mongodb";
import { Post } from "@/server/models/post.model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lightweight fingerprint — latest updatedAt from posts collection. */
async function fingerprint() {
  await connectDB();
  const doc = await Post.findOne({ status: "PUBLISHED", deletedAt: null })
    .sort({ updatedAt: -1 })
    .select("updatedAt")
    .lean() as { updatedAt?: Date } | null;
  return doc?.updatedAt?.toISOString() ?? "";
}

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;
  let last = "";
  let timer: ReturnType<typeof setInterval> | null = null;
  let ticking = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const tick = async () => {
        if (ticking || closed) return;
        ticking = true;
        try {
          const next = await fingerprint();
          if (next !== last) {
            const changed = Boolean(last);
            last = next;
            send({ type: changed ? "invalidate" : "ready", at: Date.now() });
          } else {
            send({ type: "ping", at: Date.now() });
          }
        } catch {
          send({ type: "error", at: Date.now() });
        } finally {
          ticking = false;
        }
      };

      void tick();
      timer = setInterval(() => { void tick(); }, 12_000);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
