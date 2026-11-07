import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isCompanyOnly(pathname: string) {
  return (
    pathname.startsWith("/company") ||
    pathname.startsWith("/posts/new") ||
    /\/posts\/[^/]+\/edit\/?$/.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const role = request.cookies.get("smartapply-role")?.value;
  const { pathname } = request.nextUrl;

  // Public profile pages for every role.
  if (pathname.startsWith("/entreprises") || pathname.startsWith("/candidats")) {
    return NextResponse.next();
  }

  // Legacy feed filter ?company= → full company profile page
  if (pathname === "/" || pathname === "/company") {
    const companyId = request.nextUrl.searchParams.get("company");
    if (companyId) {
      return NextResponse.redirect(new URL(`/entreprises/${companyId}`, request.url));
    }
  }

  if (role === "CANDIDATE") {
    if (isCompanyOnly(pathname) || pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (role === "COMPANY") {
    const browsingCatalog =
      pathname === "/" &&
      (request.nextUrl.searchParams.has("job") || request.nextUrl.searchParams.has("tag"));
    if (
      (!browsingCatalog && pathname === "/") ||
      pathname === "/posts" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/saved") ||
      pathname.startsWith("/apply")
    ) {
      return NextResponse.redirect(new URL("/company", request.url));
    }
  }

  if (role === "ADMIN") {
    if (
      pathname === "/" ||
      pathname === "/posts" ||
      pathname.startsWith("/company") ||
      pathname.startsWith("/saved") ||
      pathname.startsWith("/apply")
    ) {
      return NextResponse.redirect(new URL("/admin/reports", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/posts/:path*",
    "/company/:path*",
    "/entreprises/:path*",
    "/candidats/:path*",
    "/admin/:path*",
    "/saved",
    "/apply",
  ],
};
