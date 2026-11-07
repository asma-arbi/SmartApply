import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { UpdateLetterSchema } from "@/server/schemas/letters.schema";
import { getLetter, updateLetter } from "@/server/services/letters.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

export const GET = withAuth<Params>(async (req, { params }) => {
  return ok({ letter: await getLetter(req.user, params.id) });
});

export const PATCH = withAuth<Params>(async (req, { params }) => {
  const input = await parseJsonBody(req, UpdateLetterSchema);
  return ok({ letter: await updateLetter(req.user, params.id, input) });
});
