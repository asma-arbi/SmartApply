import { ok } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { toggleBookmark } from "@/server/services/engagement.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/v1/posts/:id/bookmark — toggle bookmark on a published post. */
export const POST = withAuth<Params>(async (req, { params }) => {
  const result = await toggleBookmark(req.user, params.id);
  return ok(result);
});
