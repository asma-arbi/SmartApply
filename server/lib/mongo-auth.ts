import { createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { connectDB } from "@/server/lib/mongodb";
import { User } from "@/server/models/user.model";
import { AuthSession } from "@/server/models/auth-session.model";
import { UnauthenticatedError } from "@/server/lib/errors";
import type { AuthUser, UserRole, SubscriptionPlan } from "@/server/middleware/auth";

const scrypt = promisify(scryptCallback);
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET doit contenir au moins 32 caractères.");
  return value;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, saltHex, keyHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const content = `${header}.${body}`;
  return `${content}.${createHmac("sha256", secret()).update(content).digest("base64url")}`;
}

function readToken(token: string) {
  const [header, payload, signature, extra] = token.split(".");
  if (!header || !payload || !signature || extra) throw new UnauthenticatedError("Session invalide.");
  const content = `${header}.${payload}`;
  const expected = createHmac("sha256", secret()).update(content).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    throw new UnauthenticatedError("Session invalide.");
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new UnauthenticatedError("Session invalide.");
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.sub !== "string" || typeof data.exp !== "number" || data.exp <= Date.now() / 1000) {
      throw new Error("expired");
    }
  return data as { sub: string; jti: string; exp: number };
  } catch {
    throw new UnauthenticatedError("Session expirée ou invalide.");
  }
}

export async function issueToken(user: AuthUser) {
  const now = Math.floor(Date.now() / 1000);
  const sessionId = randomUUID();
  await connectDB();
  await AuthSession.create({ _id: sessionId, userId: user.id, expiresAt: new Date((now + TOKEN_TTL_SECONDS) * 1000) });
  return {
    accessToken: sign({
      sub: user.id,
      jti: sessionId,
      email: user.email,
      role: user.role,
      plan: user.plan,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    }),
    expiresAt: now + TOKEN_TTL_SECONDS,
  };
}

export async function verifyMongoToken(token: string): Promise<AuthUser> {
  const payload = readToken(token);
  await connectDB();
  const session = await AuthSession.findOne({ _id: payload.jti, userId: payload.sub }).select("_id").lean();
  if (!session) throw new UnauthenticatedError("Cette session a été fermée ou expirée.");
  const row = await User.findById(payload.sub).select("email name role plan").lean() as {
    email?: string;
    name?: string;
    role?: UserRole;
    plan?: SubscriptionPlan;
  } | null;
  if (!row?.email) throw new UnauthenticatedError("Ce compte n'existe plus.");
  return {
    id: payload.sub,
    email: row.email,
    name: row.name?.trim() || undefined,
    role: row.role ?? "CANDIDATE",
    plan: row.plan ?? "FREE",
  };
}

export async function revokeMongoToken(token: string) {
  const payload = readToken(token);
  await connectDB();
  await AuthSession.deleteOne({ _id: payload.jti, userId: payload.sub });
}

export async function createMongoAccount(input: { email: string; password: string; name?: string }) {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("Adresse email invalide.");
  if (input.password.length < 8 || input.password.length > 128) {
    throw new Error("Le mot de passe doit contenir entre 8 et 128 caractères.");
  }
  await connectDB();
  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    email,
    passwordHash,
    name: input.name?.trim().slice(0, 100) ?? "",
    role: "CANDIDATE",
    plan: "FREE",
  });
  return {
    id: String(user._id),
    email: user.email as string,
    name: user.name?.trim() || undefined,
    role: user.role as UserRole,
    plan: user.plan as SubscriptionPlan,
  } satisfies AuthUser;
}

export async function loginMongoAccount(emailInput: string, password: string): Promise<AuthUser> {
  await connectDB();
  const user = await User.findOne({ email: emailInput.trim().toLowerCase() })
    .select("+passwordHash email name role plan")
    .lean() as {
      _id: unknown;
      email: string;
      name?: string;
      passwordHash: string;
      role: UserRole;
      plan: SubscriptionPlan;
    } | null;
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthenticatedError("Email ou mot de passe incorrect.");
  }
  return { id: String(user._id), email: user.email, name: user.name?.trim() || undefined, role: user.role, plan: user.plan };
}
