import { cookies } from "next/headers";
import { verifyMongoToken } from "@/server/lib/mongo-auth";
import { UnauthenticatedError, ForbiddenError } from "@/server/lib/errors";
import type { AuthUser, UserRole } from "@/server/middleware/auth";

export async function verifyServerUser(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get("smartapply-auth-token")?.value;
  if (!token) throw new UnauthenticatedError("Session non trouvée. Veuillez vous reconnecter.");
  return verifyMongoToken(token);
}

export async function getOptionalServerUser(): Promise<AuthUser | null> {
  try {
    return await verifyServerUser();
  } catch {
    return null;
  }
}

export async function requireRole(roles: UserRole[]): Promise<AuthUser> {
  const user = await verifyServerUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError("Votre rôle ne permet pas d'accéder à cette ressource.");
  }
  return user;
}
