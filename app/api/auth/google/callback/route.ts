import { NextRequest, NextResponse } from "next/server";
import { getDb, initDatabase } from "@/lib/mongodb";
import { createSession } from "@/lib/auth/session";
import { User } from "@/lib/models/types";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam || !code) {
    return NextResponse.redirect(`${origin}/login?error=google_failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  try {
    // 1. Échanger le code contre les jetons Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(`${origin}/login?error=google_failed`);
    }

    // 2. Récupérer le profil utilisateur Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();

    if (!profile.email) {
      return NextResponse.redirect(`${origin}/login?error=google_failed`);
    }

    await initDatabase();
    const db = await getDb();

    const email = String(profile.email).toLowerCase().trim();
    let user: User | null = await db.collection<User>("users").findOne({ email });

    if (!user) {
      const userId = "google-" + crypto.randomUUID().slice(0, 12);
      const now = new Date().toISOString();

      const newUser: User = {
        id: userId,
        email,
        password_hash: "",
        name: profile.name || email.split("@")[0],
        role: "candidat",
        auth_provider: "google",
        google_id: profile.id,
        avatar_url: profile.picture,
        created_at: now,
        updated_at: now,
      };

      await db.collection("users").insertOne(newUser as any);
      await db.collection("profiles").insertOne({
        id: userId,
        role: "candidat",
        full_name: newUser.name,
        email,
        language: "fr",
        notifications_enabled: true,
        visible_to_companies: true,
        created_at: now,
        updated_at: now,
      } as any);

      user = newUser;
    }

    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=google_failed`);
    }

    // 3. Ouvrir la session sécurisée
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
    const isProduction = process.env.NODE_ENV === "production";
    res.cookies.set("smartapply_access_token", session.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    res.cookies.set("smartapply_refresh_token", session.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err) {
    console.error("[Google OAuth Callback Error] :", err);
    return NextResponse.redirect(`${origin}/login?error=google_failed`);
  }
}
