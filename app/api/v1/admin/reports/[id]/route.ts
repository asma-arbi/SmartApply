import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { ReviewReportSchema } from "@/server/schemas/posts.schema";
import { reviewReport } from "@/server/services/moderation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** PATCH /api/v1/admin/reports/:id */
export const PATCH = withAuth<Params>(
  async (req, { params }) => {
    const input = await parseJsonBody(req, ReviewReportSchema);
    const report = await reviewReport(req.user, params.id, input.status, input.reviewNote, input.action);
    return ok({ report });
  },
  { roles: ["ADMIN"] },
);
