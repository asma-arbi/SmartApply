import { handleRoute, ok, parseJsonBody, parseQuery } from "@/server/lib/api";
import { getOptionalUser, withAuth } from "@/server/middleware/auth";
import { CommentsQuerySchema, CreateCommentSchema } from "@/server/schemas/posts.schema";
import { createComment, listComments } from "@/server/services/engagement.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/v1/posts/:id/comments */
export const GET = handleRoute<Params>(async (req, { params }) => {
  const query = parseQuery(req, CommentsQuerySchema);
  const user = await getOptionalUser(req);
  const data = await listComments(params.id, query.page, query.limit, user?.id);
  return ok(data);
});

/** POST /api/v1/posts/:id/comments */
export const POST = withAuth<Params>(async (req, { params }) => {
  const input = await parseJsonBody(req, CreateCommentSchema);
  const comment = await createComment(req.user, params.id, input.body, input.parentId);
  return ok({ comment }, { status: 201 });
});
