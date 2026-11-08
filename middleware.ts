import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_ROUTES = ["/login", "/register"];
const DASHBOARD_PREFIX = "/dashboard";
const ACCESS_TOKEN_COOKIE = "smartapply_access_token";
const REFRESH_TOKEN_COOKIE = "smartapply_refresh_token";

// Page des entretiens partagée entre le recruteur et le candidat
const SHARED_INTERVIEWS_PATH = "/dashboard/company/interviews";

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "smartapply_jwt_super_secret_key_minimum_32_characters_long_2026"
);

function redirectByRole(role: string | null | undefined, baseUrl: string) {
  const url = new URL(baseUrl);
  if (role === "admin") url.pathname = "/dashboard/admin";
  else if (role === "entreprise") url.pathname = "/dashboard/company";
  else url.pathname = "/dashboard/candidate";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next({ request: req });

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  let userRole: string | undefined = undefined;
  let isAuthenticated = false;

  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, ACCESS_TOKEN_SECRET);
      if (payload && payload.sub) {
        isAuthenticated = true;
        userRole = (payload.role as string) || "candidat";
      }
    } catch {
      // Access token expiré ou invalide
      // Si un refresh token est présent, la session sera renouvelée par Server Components / Actions
      if (refreshToken) {
        isAuthenticated = true;
      }
    }
  } else if (refreshToken) {
    // Refresh token présent
    isAuthenticated = true;
  }

  // ── Pages d'authentification (/login, /register) ──
  if (AUTH_ROUTES.includes(pathname)) {
    // Si l'utilisateur arrive avec un paramètre de révocation, d'erreur ou de redirection
    // -> Purger immédiatement les cookies résiduels pour casser net toute boucle infinie
    if (
      req.nextUrl.searchParams.has("revoked") ||
      req.nextUrl.searchParams.has("from") ||
      req.nextUrl.searchParams.has("error") ||
      req.nextUrl.searchParams.has("msg")
    ) {
      const cleanRes = NextResponse.next();
      cleanRes.cookies.set(ACCESS_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
      cleanRes.cookies.set(REFRESH_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
      return cleanRes;
    }

    if (isAuthenticated) {
      return redirectByRole(userRole, req.url);
    }
    return res;
  }

  // ── Protection des routes dashboard ───────────────────────────
  if (pathname.startsWith(DASHBOARD_PREFIX)) {
    if (!isAuthenticated) {
      const url = new URL("/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }

    // /dashboard racine → redirection selon le rôle
    if (pathname === "/dashboard") {
      return redirectByRole(userRole, req.url);
    }

    // Si on a le rôle décodé depuis l'Access Token, on applique le RBAC
    if (userRole) {
      if (userRole === "admin") {
        return res; // Super Admin a tous les droits
      }

      // Le candidat peut accéder à la page des entretiens (vue candidat)
      const isSharedInterviews =
        pathname === SHARED_INTERVIEWS_PATH || pathname.startsWith(`${SHARED_INTERVIEWS_PATH}/`);

      if (pathname.startsWith("/dashboard/candidate") && userRole !== "candidat") {
        return NextResponse.redirect(new URL("/access-denied", req.url));
      }
      if (
        pathname.startsWith("/dashboard/company") &&
        userRole !== "entreprise" &&
        !(isSharedInterviews && userRole === "candidat")
      ) {
        return NextResponse.redirect(new URL("/access-denied", req.url));
      }
      if (pathname.startsWith("/dashboard/admin") && userRole !== "admin") {
        return NextResponse.redirect(new URL("/access-denied", req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-|sw.js|manifest.json|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};