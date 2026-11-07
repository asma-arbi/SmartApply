import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { ModeratePostSchema } from "@/server/schemas/posts.schema";
import { moderatePost } from "@/server/services/moderation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/v1/admin/posts/:id/moderate */
export const POST = withAuth<Params>(
  async (req, { params }) => {
    const input = await parseJsonBody(req, ModeratePostSchema);
    const post = await moderatePost(req.user, params.id, input.action, input.reason);
    return ok({ post });
  },
  { roles: ["ADMIN"] },
);
