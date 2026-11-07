import { ok, parseJsonBody, parseQuery } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { CompanyPostsQuerySchema, CreatePostSchema } from "@/server/schemas/posts.schema";
import { createPost, listCompanyPosts } from "@/server/services/posts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/company/posts — all statuses for companies the caller belongs to. */
export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, CompanyPostsQuerySchema);
    const data = await listCompanyPosts(req.user, query);
    return ok(data);
  },
  { roles: ["CANDIDATE", "COMPANY", "ADMIN"] },
);

/**
 * POST /api/v1/company/posts
 * Create announcement / career advice / recruitment news / internship announcement.
 * Optional jobId must belong to the same company (Fares jobs table).
 */
export const POST = withAuth(
  async (req) => {
    const input = await parseJsonBody(req, CreatePostSchema);
    const post = await createPost(req.user, input);
    return ok({ post }, { status: 201 });
  },
  { roles: ["COMPANY", "ADMIN"] },
);
