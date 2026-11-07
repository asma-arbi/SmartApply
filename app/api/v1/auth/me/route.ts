import { ok } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (req) => {
  return ok({ user: req.user });
});
