import { ok } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { listNetworkState } from "@/server/services/network.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/network — follows + connections for current user */
export const GET = withAuth(async (req) => {
  return ok(await listNetworkState(req.user));
});
