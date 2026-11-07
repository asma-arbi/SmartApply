import { API_URL } from "@/lib/constants";
import {
  clearSession,
  getStoredToken,
  isJwtExpired,
  peekStoredToken,
  SESSION_EXPIRED_EVENT,
} from "@/lib/auth-storage";

export { SESSION_EXPIRED_EVENT };

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: { code: string; message: string };
};

function needsAuth(path: string, method: string) {
  if (path.startsWith("/auth/")) return false;
  if (method !== "GET") return true;
  return (
    path.startsWith("/me/") ||
    path.startsWith("/network") ||
    path.startsWith("/company/") ||
    path.startsWith("/admin/") ||
    path.startsWith("/letters")
  );
}

function sessionError() {
  return new ApiError("Session expirée. Reconnectez-vous.", "UNAUTHENTICATED", 401);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const token = getStoredToken();
  if (!token && needsAuth(path, method)) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw sessionError();
  }
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const timeoutMs = method === "GET" ? 15_000 : 25_000;
  const timeoutSignal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      cache: "no-store",
      ...options,
      headers,
      signal: options.signal ?? timeoutSignal,
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || /aborted|timeout/i.test(err.message))) {
      throw new ApiError("Délai dépassé. Réessayez dans un instant.", "TIMEOUT", 408);
    }
    throw err;
  }

  let json: ApiSuccess<T> | ApiFailure;
  try {
    json = (await res.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new ApiError("Réponse API invalide.", "INTERNAL_ERROR", res.status);
  }

  if (!json.success) {
    if (res.status === 401 && token) {
      const current = peekStoredToken();
      // Stale in-flight 401 must not wipe a newer login session (open → close bug).
      if (current && current !== token) {
        throw new ApiError(json.error.message || "Requête obsolète.", json.error.code, res.status);
      }

      const message = json.error.message ?? "";
      const definitelyDead =
        isJwtExpired(token) ||
        /expir|invalid|invalide|manquant/i.test(message);

      if (definitelyDead) {
        clearSession();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
      }

      const publicGet =
        method === "GET" &&
        !path.startsWith("/me/") &&
        !path.startsWith("/company/") &&
        !path.startsWith("/admin/");
      if (publicGet) {
        const retryHeaders = new Headers(options.headers);
        retryHeaders.delete("Authorization");
        const retry = await fetch(`${API_URL}/api/v1${path}`, {
          ...options,
          headers: retryHeaders,
        });
        try {
          json = (await retry.json()) as ApiSuccess<T> | ApiFailure;
        } catch {
          throw new ApiError("Réponse API invalide.", "INTERNAL_ERROR", retry.status);
        }
        if (json.success) return json.data;
      }
    }
    if (res.status === 401) {
      if (path.startsWith("/auth/")) {
        throw new ApiError(json.error.message, json.error.code, res.status);
      }
      // Keep UI session unless we already cleared a dead JWT above.
      throw new ApiError(
        json.error.message || "Authentification refusée. Réessayez.",
        json.error.code || "UNAUTHENTICATED",
        res.status,
      );
    }
    throw new ApiError(json.error.message, json.error.code, res.status);
  }
  return json.data;
}
