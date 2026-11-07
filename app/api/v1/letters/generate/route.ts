import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { GenerateLetterSchema } from "@/server/schemas/letters.schema";
import { generateLetter } from "@/server/services/letters.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (req) => {
  const input = await parseJsonBody(req, GenerateLetterSchema);
  const data = await generateLetter(req.user, input.applicationId, input.language);
  return ok(data, { status: 201 });
});
