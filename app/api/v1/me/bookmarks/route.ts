import { ok, parseQuery } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { BookmarksQuerySchema } from "@/server/schemas/posts.schema";
import { listBookmarks } from "@/server/services/engagement.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/me/bookmarks */
export const GET = withAuth(async (req) => {
  const query = parseQuery(req, BookmarksQuerySchema);
  const data = await listBookmarks(req.user, query.page, query.limit);
  return ok(data);
});
