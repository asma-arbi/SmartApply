import { ok, parseQuery } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { AdminReportsQuerySchema } from "@/server/schemas/posts.schema";
import { listReports } from "@/server/services/moderation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/admin/posts/reports */
export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, AdminReportsQuerySchema);
    const data = await listReports(query.status, query.page, query.limit);
    return ok(data);
  },
  { roles: ["ADMIN"] },
);
