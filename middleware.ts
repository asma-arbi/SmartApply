import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register"];
const DASHBOARD_PREFIX = "/dashboard";

function redirectByRole(role: string | null, baseUrl: string) {
  const url = new URL(baseUrl);
  if (role === "admin") url.pathname = "/dashboard/admin";
  else if (role === "entreprise") url.pathname = "/dashboard/company";
  else url.pathname = "/dashboard/candidate";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = user?.user_metadata?.role as string | undefined;

  // Si le rôle n'est pas dans user_metadata, vérification de secours dans profiles
  if (user && (!role || role === "candidat")) {
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.role) role = prof.role;
    } catch {}
  }

  // ── Rediriger les utilisateurs connectés hors des pages d'authentification ──
  if (user && AUTH_ROUTES.includes(pathname)) {
    return redirectByRole(role ?? "candidat", req.url);
  }

  // ── Protection des routes dashboard ───────────────────────────
  if (pathname.startsWith(DASHBOARD_PREFIX)) {
    if (!user) {
      const url = new URL("/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }

    // /dashboard root → redirection selon le rôle
    if (pathname === "/dashboard") {
      return redirectByRole(role ?? "candidat", req.url);
    }

    // L'administrateur a un accès complet à tous les espaces
    if (role === "admin") {
      return res;
    }

    // Contrôle d'accès par rôle
    if (
      pathname.startsWith("/dashboard/candidate") &&
      role !== "candidat"
    ) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }
    if (
      pathname.startsWith("/dashboard/company") &&
      role !== "entreprise"
    ) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }
    if (
      pathname.startsWith("/dashboard/admin") &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
