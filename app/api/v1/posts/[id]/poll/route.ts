import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { VotePollSchema } from "@/server/schemas/posts.schema";
import { votePoll } from "@/server/services/posts.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** POST /api/v1/posts/:id/poll — vote or change a vote on a poll. */
export const POST = withAuth<Params>(
  async (req, { params }) => {
    const input = await parseJsonBody(req, VotePollSchema);
    const results = await votePoll(req.user, params.id, input.optionIndex);
    return ok({ pollResults: results });
  },
  { roles: ["CANDIDATE", "COMPANY", "ADMIN"] },
);
