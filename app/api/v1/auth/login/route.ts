import { handleRoute, ok, parseJsonBody } from "@/server/lib/api";
import { issueToken, loginMongoAccount } from "@/server/lib/mongo-auth";
import { LoginSchema } from "@/server/schemas/auth.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleRoute(async (req) => {
  const input = await parseJsonBody(req, LoginSchema);
  const user = await loginMongoAccount(input.email, input.password);
  const token = await issueToken(user);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return ok(
    { ...token, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    { headers: { "Set-Cookie": `smartapply-auth-token=${encodeURIComponent(token.accessToken)}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax${secure}` } },
  );
});
