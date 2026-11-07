import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { pinPost } from "@/server/services/posts.service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

const PinSchema = z.object({ pinned: z.boolean().optional() }).strict();

/** POST /api/v1/posts/:id/pin — pin or unpin (saved on MongoDB). */
export const POST = withAuth<Params>(
  async (req, { params }) => {
    const body = await parseJsonBody(req, PinSchema);
    const post = await pinPost(req.user, params.id, body.pinned !== false);
    return ok({ post });
  },
  { roles: ["CANDIDATE", "COMPANY", "ADMIN"] },
);

