import { ok } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { listLetters } from "@/server/services/letters.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (req) => {
  return ok(await listLetters(req.user));
});
