import { z } from "zod";
import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { toggleConnect } from "@/server/services/network.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  // Mongo documents use 24-character ObjectIds; service validation confirms role/existence.
  candidateId: z.string().trim().min(1).max(64),
});

/** POST /api/v1/network/connect — request / accept / remove connection */
export const POST = withAuth(async (req) => {
  const body = await parseJsonBody(req, BodySchema);
  return ok(await toggleConnect(req.user, body.candidateId));
});
