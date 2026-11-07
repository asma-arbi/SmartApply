import { ok } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { ReactPostSchema } from "@/server/schemas/posts.schema";
import { toggleCommentLike } from "@/server/services/engagement.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/v1/comments/:id/like — toggle or change reaction on a comment. */
export const POST = withAuth<Params>(async (req, { params }) => {
  let type: "LIKE" | "LOVE" | "CELEBRATE" | "INSIGHTFUL" | "SUPPORT" | "FUNNY" = "LIKE";
  try {
    const raw = await req.json();
    type = ReactPostSchema.parse(raw).type ?? "LIKE";
  } catch {
    type = "LIKE";
  }
  const result = await toggleCommentLike(req.user, params.id, type);
  return ok(result);
});
