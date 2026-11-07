import type { NextRequest, NextResponse } from "next/server";
import { verifyMongoToken } from "@/server/lib/mongo-auth";
import { handleRoute } from "@/server/lib/api";
import { ForbiddenError, UnauthenticatedError } from "@/server/lib/errors";

export type UserRole = "CANDIDATE" | "COMPANY" | "ADMIN";
export type SubscriptionPlan = "FREE" | "PREMIUM";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  plan: SubscriptionPlan;
}

export type AuthenticatedRequest = NextRequest & { user: AuthUser };

function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function verifyRequestUser(req: NextRequest): Promise<AuthUser> {
  const token = extractBearerToken(req);
  if (!token) throw new UnauthenticatedError("En-tête Authorization: Bearer <token> manquant.");
  return verifyMongoToken(token);
}

/** Missing or expired token → anonymous so public lists still load. */
export async function getOptionalUser(req: NextRequest): Promise<AuthUser | null> {
  if (!extractBearerToken(req)) return null;
  try {
    return await verifyRequestUser(req);
  } catch (err) {
    if (err instanceof UnauthenticatedError) return null;
    throw err;
  }
}

export async function authenticate(req: NextRequest, allowedRoles?: readonly UserRole[]): Promise<AuthenticatedRequest> {
  const user = await verifyRequestUser(req);
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new ForbiddenError("Votre rôle ne permet pas d'accéder à cette ressource.");
  }
  const authed = req as AuthenticatedRequest;
  authed.user = user;
  return authed;
}

type RouteContext<P> = { params: P };
type AuthedHandler<P> = (req: AuthenticatedRequest, ctx: RouteContext<P>) => Promise<NextResponse>;

export function withAuth<P = Record<string, never>>(
  handler: AuthedHandler<P>,
  options: { roles?: readonly UserRole[] } = {},
) {
  const roles = options.roles;
  return handleRoute<P>(async (req, ctx) => {
    const authed = await authenticate(req, roles);
    return handler(authed, ctx);
  });
}
