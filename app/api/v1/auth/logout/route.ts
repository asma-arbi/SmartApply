import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeMongoToken } from "@/server/lib/mongo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("smartapply-auth-token")?.value;
  if (token) {
    try {
      await revokeMongoToken(token);
    } catch {
      // Expired sessions are cleared locally even if their database record is gone.
    }
  }
  const response = NextResponse.json({ success: true, data: null });
  response.cookies.set("smartapply-auth-token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
