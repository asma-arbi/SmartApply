import { handleRoute, ok, parseJsonBody, parseQuery } from "@/server/lib/api";
import { getOptionalUser, withAuth } from "@/server/middleware/auth";
import { CreatePostSchema, SearchPostsQuerySchema } from "@/server/schemas/posts.schema";
import { createPost, searchPublishedPosts } from "@/server/services/posts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/posts
 * Public search of PUBLISHED posts by title, category, company and tags.
 */
export const GET = handleRoute(async (req) => {
  const query = parseQuery(req, SearchPostsQuerySchema);
  const user = await getOptionalUser(req);
  const data = await searchPublishedPosts(query, user?.id);
  return ok(data);
});

/**
 * POST /api/v1/posts
 * Authenticated user creates a post — inserted immediately into `posts`.
 * companyId is optional: the caller's company is reused or created on the fly.
 */
export const POST = withAuth(
  async (req) => {
    const input = await parseJsonBody(req, CreatePostSchema);
    const post = await createPost(req.user, input);
    return ok({ post }, { status: 201 });
  },
  { roles: ["CANDIDATE", "COMPANY", "ADMIN"] },
);
