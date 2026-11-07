import { ok } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { publishPost } from "@/server/services/posts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/v1/posts/:id/publish — claimed + verified company only. */
export const POST = withAuth<Params>(
  async (req, { params }) => {
    const post = await publishPost(req.user, params.id);
    return ok({ post });
  },
);
