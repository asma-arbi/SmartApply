import { ok } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { hidePost, unhidePost } from "@/server/services/engagement.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/v1/posts/:id/hide — hide post from the viewer's feed (MongoDB). */
export const POST = withAuth<Params>(async (req, { params }) => {
  const result = await hidePost(req.user, params.id);
  return ok(result);
});

/** DELETE /api/v1/posts/:id/hide — restore a previously hidden post. */
export const DELETE = withAuth<Params>(async (req, { params }) => {
  const result = await unhidePost(req.user, params.id);
  return ok(result);
});

