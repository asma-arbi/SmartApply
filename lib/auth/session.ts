import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import { getDb, initDatabase } from "@/lib/mongodb";
import { Session, User } from "@/lib/models/types";

// Configuration des durées
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /^(?:your_|votre_|replace_|smartapply_jwt_super_secret)/i.test(process.env.JWT_SECRET))) {
  throw new Error("JWT_SECRET must contain at least 32 characters in production.");
}

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "smartapply_jwt_super_secret_key_minimum_32_characters_long_2026"
);

export const ACCESS_TOKEN_COOKIE = "smartapply_access_token";
export const REFRESH_TOKEN_COOKIE = "smartapply_refresh_token";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_DAYS = 30; // 30 jours (expiration absolue)
export const INACTIVITY_TIMEOUT_DAYS = 7; // 7 jours d'inactivité

export function getSecureCookieOptions(maxAgeSeconds: number) {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/**
 * Hache un token avec SHA-256 pour stockage sécurisé en base
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Génère un access token JWT signé
 */
export async function signAccessToken(payload: {
  userId: string;
  email: string;
  name: string;
  role: string;
  sessionId: string;
}): Promise<string> {
  return await new SignJWT({
    role: payload.role,
    email: payload.email,
    name: payload.name,
    sid: payload.sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(ACCESS_TOKEN_SECRET);
}

/**
 * Vérifie un access token JWT
 */
export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, ACCESS_TOKEN_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Parse sommaire d'un User-Agent pour affichage clair
 */
export function parseDeviceName(userAgent: string): string {
  if (!userAgent || userAgent === "Inconnu") return "Navigateur Web";
  
  let browser = "Navigateur";
  if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("Chrome/")) browser = "Chrome";
  else if (userAgent.includes("Firefox/")) browser = "Firefox";
  else if (userAgent.includes("Safari/")) browser = "Safari";

  let os = "Inconnu";
  if (userAgent.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
  else if (userAgent.includes("Mac OS X")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";

  return `${browser} sur ${os}`;
}

/**
 * Récupère l'IP du client depuis les headers
 */
export function getClientIp(): string {
  try {
    const h = headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = h.get("x-real-ip");
    if (realIp) return realIp.trim();
  } catch {}
  return "127.0.0.1";
}

/**
 * Récupère le User-Agent du client
 */
export function getClientUserAgent(): string {
  try {
    const h = headers();
    return h.get("user-agent") || "Navigateur Web";
  } catch {}
  return "Navigateur Web";
}

/**
 * Crée une nouvelle session pour un utilisateur avec Access Token et Refresh Token rotatif
 */
export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  await initDatabase();
  const db = await getDb();

  const currentUser = await db.collection<User>("users").findOne({id:user.id,active:{$ne:false}});
  if(!currentUser)throw new Error("Compte indisponible.");
  user=currentUser;
  const sessionId = crypto.randomUUID();
  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = hashToken(rawRefreshToken);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const userAgent = getClientUserAgent();
  const ip = getClientIp();

  const sessionDoc: Session = {
    id: sessionId,
    user_id: user.id,
    user_agent: userAgent,
    ip,
    refresh_token_hash: refreshTokenHash,
    created_at: now.toISOString(),
    last_active_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
  };

  await db.collection("sessions").insertOne(sessionDoc as any);

  // Générer le JWT Access Token
  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionId,
  });

  // Placer les cookies sécurisés
  const cookieStore = cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, getSecureCookieOptions(ACCESS_TOKEN_TTL_SECONDS));
  cookieStore.set(REFRESH_TOKEN_COOKIE, rawRefreshToken, getSecureCookieOptions(REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60));

  return { accessToken, refreshToken: rawRefreshToken, sessionId };
}

/**
 * Vérifie et renouvelle automatiquement la session si nécessaire (Rotation de Refresh Token)
 */
export async function getSessionUser(): Promise<{
  user: { id: string; email: string; name: string; role: string };
  sessionId: string;
} | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const rawRefreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  await initDatabase();
  const db = await getDb();

  // 1. Tenter la vérification de l'Access Token (durée courte)
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload && payload.sub && payload.sid) {
      const sessionId = payload.sid as string;
      const session = await db.collection<Session>("sessions").findOne({ id: sessionId, user_id: payload.sub });

      if (session && !session.revoked_at) {
        const now = new Date();
        const expiresAt = new Date(session.expires_at);
        const lastActive = new Date(session.last_active_at);
        const inactiveLimit = new Date(lastActive.getTime() + INACTIVITY_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);

        // Expiration absolue ou d'inactivité
        if (now < expiresAt && now < inactiveLimit) {
          // Mettre à jour last_active_at si plus de 2 minutes écoulées
          if (now.getTime() - lastActive.getTime() > 2 * 60 * 1000) {
            await db.collection("sessions").updateOne(
              { id: sessionId },
              { $set: { last_active_at: now.toISOString() } }
            );
          }

          const currentUser=await db.collection<User>("users").findOne({id:session.user_id,active:{$ne:false}});
          if(!currentUser)return null;
          return {user:{id:currentUser.id,email:currentUser.email,name:currentUser.name,role:currentUser.role},sessionId};
        }
      }
    }
  }

  // 2. Si l'access token est expiré mais qu'on a un Refresh Token valide -> Rotation
  if (rawRefreshToken) {
    const refreshTokenHash = hashToken(rawRefreshToken);
    const session = await db.collection<Session>("sessions").findOne({
      refresh_token_hash: refreshTokenHash,
      revoked_at: null,
    });

    if (session) {
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      const lastActive = new Date(session.last_active_at);
      const inactiveLimit = new Date(lastActive.getTime() + INACTIVITY_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);

      if (now < expiresAt && now < inactiveLimit) {
        // Récupérer l'utilisateur
        const user = await db.collection<User>("users").findOne({ id: session.user_id,active:{$ne:false} });
        if (user) {
          // Mettre à jour l'activité
          await db.collection("sessions").updateOne(
            { id: session.id },
            { $set: { last_active_at: now.toISOString() } }
          );

          // Tenter la rotation des tokens si le contexte d'exécution autorise l'écriture de cookies (Server Action / Route Handler)
          try {
            const newRawRefreshToken = crypto.randomBytes(40).toString("hex");
            const newRefreshTokenHash = hashToken(newRawRefreshToken);

            const newAccessToken = await signAccessToken({
              userId: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              sessionId: session.id,
            });

            // Tenter l'écriture des cookies (lève une exception dans un Server Component en phase de rendu)
            cookieStore.set(
              ACCESS_TOKEN_COOKIE,
              newAccessToken,
              getSecureCookieOptions(ACCESS_TOKEN_TTL_SECONDS)
            );
            cookieStore.set(
              REFRESH_TOKEN_COOKIE,
              newRawRefreshToken,
              getSecureCookieOptions(REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60)
            );

            // Si l'écriture a réussi (Server Action ou Route Handler), on valide la rotation dans MongoDB
            await db.collection("sessions").updateOne(
              { id: session.id },
              { $set: { refresh_token_hash: newRefreshTokenHash } }
            );
          } catch {
            // Dans un Server Component (phase de rendu), Next.js interdit cookies().set().
            // On conserve l'ancien refresh token intact en base : la session reste 100% valide sans crash.
          }

          return {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            sessionId: session.id,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Supprime les cookies de session actuels
 */
export function clearAuthCookies() {
  const cookieStore = cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  cookieStore.set(REFRESH_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Révoque la session active
 */
export async function destroyCurrentSession() {
  const cookieStore = cookies();
  const rawRefreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (rawRefreshToken) {
    try {
      const db = await getDb();
      const refreshTokenHash = hashToken(rawRefreshToken);
      await db.collection("sessions").updateOne(
        { refresh_token_hash: refreshTokenHash },
        { $set: { revoked_at: new Date().toISOString() } }
      );
    } catch {}
  }

  clearAuthCookies();
}

/**
 * Liste les sessions actives de l'utilisateur avec appareil et statut
 */
export async function listActiveSessions(userId: string) {
  await initDatabase();
  const db = await getDb();
  const now = new Date();

  const sessions = await db
    .collection<Session>("sessions")
    .find({
      user_id: userId,
      revoked_at: null,
      expires_at: { $gt: now.toISOString() },
    })
    .sort({ last_active_at: -1 })
    .toArray();

  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  let currentSid = "";
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    currentSid = (payload?.sid as string) || "";
  }

  return sessions
    .filter((s) => {
      const lastActive = new Date(s.last_active_at);
      const inactiveLimit = new Date(lastActive.getTime() + INACTIVITY_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);
      return now < inactiveLimit;
    })
    .map((s) => ({
      id: s.id,
      deviceName: parseDeviceName(s.user_agent),
      ip: s.ip,
      created_at: s.created_at,
      last_active_at: s.last_active_at,
      isCurrent: s.id === currentSid,
    }));
}

/**
 * Révoque une session précise par son identifiant
 */
export async function revokeSessionById(sessionId: string, userId: string) {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection("sessions").updateOne(
    { id: sessionId, user_id: userId },
    { $set: { revoked_at: now } }
  );

  // Si c'est la session actuelle, vider les cookies
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload?.sid === sessionId) {
      clearAuthCookies();
    }
  }
}

/**
 * Déconnecte tous les appareils (invalide toutes les sessions d'un utilisateur)
 */
export async function invalidateAllUserSessions(userId: string) {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection("sessions").updateMany(
    { user_id: userId, revoked_at: null },
    { $set: { revoked_at: now } }
  );

  clearAuthCookies();
}

/**
 * Déconnecte tous les appareils sauf l'appareil actuel
 */
export async function revokeAllOtherSessions(userId: string, currentSessionId: string) {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection("sessions").updateMany(
    { user_id: userId, id: { $ne: currentSessionId }, revoked_at: null },
    { $set: { revoked_at: now } }
  );
}
