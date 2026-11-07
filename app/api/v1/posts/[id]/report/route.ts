import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { CreateReportSchema } from "@/server/schemas/posts.schema";
import { reportPost } from "@/server/services/engagement.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/v1/posts/:id/report */
export const POST = withAuth<Params>(async (req, { params }) => {
  const input = await parseJsonBody(req, CreateReportSchema);
  const report = await reportPost(req.user, params.id, input.reason, input.details);
  return ok({ report }, { status: 201 });
});
