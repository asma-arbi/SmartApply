import { handleRoute, ok, parseJsonBody } from "@/server/lib/api";
import { getOptionalUser, withAuth } from "@/server/middleware/auth";
import { UpdatePostSchema } from "@/server/schemas/posts.schema";
import { deletePost, getPostById, updatePost } from "@/server/services/posts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/v1/posts/:id — published posts are public; drafts only for company members / admin. */
export const GET = handleRoute<Params>(async (req, { params }) => {
  const user = await getOptionalUser(req);
  const post = await getPostById(params.id, user);
  return ok({ post });
});

/** PATCH /api/v1/posts/:id — company member of the owning enterprise. */
export const PATCH = withAuth<Params>(
  async (req, { params }) => {
    const input = await parseJsonBody(req, UpdatePostSchema);
    const post = await updatePost(req.user, params.id, input);
    return ok({ post });
  },
);

/** DELETE /api/v1/posts/:id — hard-delete drafts, soft-remove published/archived. */
export const DELETE = withAuth<Params>(
  async (req, { params }) => {
    const result = await deletePost(req.user, params.id);
    return ok(result);
  },
);
