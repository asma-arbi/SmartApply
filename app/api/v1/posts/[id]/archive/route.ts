import { ok } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { archivePost } from "@/server/services/posts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/v1/posts/:id/archive */
export const POST = withAuth<Params>(
  async (req, { params }) => {
    const post = await archivePost(req.user, params.id);
    return ok({ post });
  },
);
