import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { UpdateCommentSchema } from "@/server/schemas/posts.schema";
import { deleteComment, updateComment } from "@/server/services/engagement.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

export const PATCH = withAuth<Params>(async (req, { params }) => {
  const input = await parseJsonBody(req, UpdateCommentSchema);
  const comment = await updateComment(req.user, params.id, input.body);
  return ok({ comment });
});

export const DELETE = withAuth<Params>(async (req, { params }) => {
  const result = await deleteComment(req.user, params.id);
  return ok(result);
});
