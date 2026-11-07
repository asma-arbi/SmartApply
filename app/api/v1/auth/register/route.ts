import { handleRoute, ok, parseJsonBody } from "@/server/lib/api";
import { createMongoAccount, issueToken } from "@/server/lib/mongo-auth";
import { RegisterSchema } from "@/server/schemas/auth.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req) => {
  const input = await parseJsonBody(req, RegisterSchema);
  const user = await createMongoAccount(input);
  const token = await issueToken(user);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return ok(
    { ...token, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    { status: 201, headers: { "Set-Cookie": `smartapply-auth-token=${encodeURIComponent(token.accessToken)}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax${secure}` } },
  );
});
