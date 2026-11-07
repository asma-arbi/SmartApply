import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { SendLetterSchema } from "@/server/schemas/letters.schema";
import { sendLetter } from "@/server/services/letters.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

export const POST = withAuth<Params>(async (req, { params }) => {
  const input = await parseJsonBody(req, SendLetterSchema);
  return ok(await sendLetter(req.user, params.id, input.confirm));
});
