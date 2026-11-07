import { z } from "zod";
import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { toggleFollow } from "@/server/services/network.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  type: z.enum(["company", "candidate"]),
  // Mongo documents use 24-character ObjectIds; service validation confirms existence.
  id: z.string().trim().min(1).max(64),
});

/** POST /api/v1/network/follow — toggle follow (MongoDB) */
export const POST = withAuth(async (req) => {
  const body = await parseJsonBody(req, BodySchema);
  return ok(await toggleFollow(req.user, body.type, body.id));
});

