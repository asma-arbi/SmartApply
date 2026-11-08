import { NextRequest, NextResponse } from "next/server";
import { getDb, initDatabase } from "@/lib/mongodb";
import {
  createSession,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_DAYS,
  getSecureCookieOptions,
} from "@/lib/auth/session";
import { User } from "@/lib/models/types";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const demoEmail = searchParams.get("email");

  // 1. Si une connexion Google de test direct est déclenchée (ou pas de GOOGLE_CLIENT_ID configuré)
  if (!clientId || clientId.startsWith("your_") || demoEmail) {
    try {
      await initDatabase();
      const db = await getDb();

      const email = (demoEmail || "asmaarbi27@gmail.com").toLowerCase().trim();
      const nameParam = searchParams.get("name");
      const name = nameParam || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const roleParam = searchParams.get("role");
      const role = (roleParam === "entreprise" ? "entreprise" : "candidat") as "candidat" | "entreprise";

      let user: User | null = await db.collection<User>("users").findOne({ email });

      if (!user) {
        const userId = "google-" + crypto.randomUUID().slice(0, 12);
        const now = new Date().toISOString();

        const newUser: User = {
          id: userId,
          email,
          password_hash: "", // Authentifié par Google OAuth
          name,
          role,
          auth_provider: "google",
          company_name: role === "entreprise" ? name : undefined,
          google_id: "google-sub-" + Date.now(),
          created_at: now,
          updated_at: now,
        };

        await db.collection("users").insertOne(newUser as any);
        await db.collection("profiles").insertOne({
          id: userId,
          role,
          full_name: name,
          email,
          language: "fr",
          notifications_enabled: true,
          visible_to_companies: true,
          created_at: now,
          updated_at: now,
        } as any);

        if (role === "entreprise") {
          await db.collection("companies").insertOne({
            id: userId,
            name,
            status: "pending",
            created_at: now,
          } as any);
        }

        user = newUser;
      }

      if (!user) {
        return NextResponse.redirect(`${origin}/login?error=google_failed`);
      }

      // Ouvrir la session sécurisée
      const session = await createSession({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const redirectPath =
        user.role === "admin"
          ? "/dashboard/admin"
          : user.role === "entreprise"
          ? "/dashboard/company"
          : "/dashboard/candidate";

      const res = NextResponse.redirect(new URL(redirectPath, request.url));
      // Attacher explicitement les cookies sécurisés à la réponse HTTP 307
      res.cookies.set(
        ACCESS_TOKEN_COOKIE,
        session.accessToken,
        getSecureCookieOptions(ACCESS_TOKEN_TTL_SECONDS)
      );
      res.cookies.set(
        REFRESH_TOKEN_COOKIE,
        session.refreshToken,
        getSecureCookieOptions(REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60)
      );

      return res;
    } catch (err) {
      console.error("[Google Auth Error] :", err);
      return NextResponse.redirect(new URL("/login?error=google_failed", request.url));
    }
  }

  // 2. Flux standard Google OAuth 2.0 en production
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleAuthUrl.toString());
}
