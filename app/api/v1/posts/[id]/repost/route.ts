import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { repostPost } from "@/server/services/posts.service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

const RepostSchema = z
  .object({
    commentary: z.string().trim().max(5000).optional(),
  })
  .strict();

/** POST /api/v1/posts/:id/repost — create a new post linked to the original in MongoDB. */
export const POST = withAuth<Params>(
  async (req, { params }) => {
    const body = await parseJsonBody(req, RepostSchema);
    const post = await repostPost(req.user, params.id, body.commentary);
    return ok({ post }, { status: 201 });
  },
  { roles: ["CANDIDATE", "COMPANY", "ADMIN"] },
);

