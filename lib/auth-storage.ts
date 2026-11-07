const TOKEN_KEY = "smartapply-auth-token";
const USER_KEY = "smartapply-auth-user";
const ROLE_COOKIE = "smartapply-role";
const LEGACY_KEYS = ["pulse-auth-token", "pulse-auth-user"];

export type StoredUser = {
  id: string;
  email: string;
  name?: string;
  role: "CANDIDATE" | "COMPANY" | "ADMIN";
};

function writeRoleCookie(role?: StoredUser["role"] | null) {
  if (typeof document === "undefined") return;
  if (!role) {
    document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=2592000; SameSite=Lax`;
}

export const SESSION_EXPIRED_EVENT = "smartapply:session-expired";

function emitSessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

function decodeJwtPayload(token: string) {
  const part = token.split(".")[1] ?? "";
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(atob(padded)) as { exp?: number };
}

export function isJwtExpired(token: string) {
  try {
    const payload = decodeJwtPayload(token);
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now() + 5_000;
  } catch {
    return true;
  }
}

/** Raw token without expiry side-effects (safe for comparing in-flight requests). */
export function peekStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  const legacyToken = window.localStorage.getItem("pulse-auth-token");
  const legacyUser = window.localStorage.getItem("pulse-auth-user");
  if (legacyToken && !window.localStorage.getItem(TOKEN_KEY)) {
    window.localStorage.setItem(TOKEN_KEY, legacyToken);
    if (legacyUser) window.localStorage.setItem(USER_KEY, legacyUser);
  }
  for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token && isJwtExpired(token)) {
    clearSession();
    emitSessionExpired();
    return null;
  }
  return token;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  if (!getStoredToken()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: StoredUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  writeRoleCookie(user.role);
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  writeRoleCookie(null);
}

export function syncRoleCookie() {
  const user = getStoredUser();
  writeRoleCookie(user?.role ?? null);
}
