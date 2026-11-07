"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginAction, logoutAction, registerAction } from "@/server/actions/auth.actions";
import {
  SESSION_EXPIRED_EVENT,
  clearSession,
  getStoredToken,
  getStoredUser,
  setSession,
  syncRoleCookie,
  type StoredUser,
} from "@/lib/auth-storage";
import type { AuthUser } from "@/types/post";
import { heartbeatPresenceAction } from "@/server/actions/presence.actions";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: { name: string; email: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      setToken(getStoredToken());
      setUser(getStoredUser());
      syncRoleCookie();
      setReady(true);
    }, 0);
    function onExpired() {
      // Re-read storage: a stale 401 must not wipe a fresh login already written.
      const nextToken = getStoredToken();
      const nextUser = getStoredUser();
      setToken(nextToken);
      setUser(nextUser);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.clearTimeout(initTimer);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  useEffect(() => {
    const activeUserId = user?.id;
    if (!ready || !activeUserId) return;
    let stopped = false;
    const heartbeat = () => {
      if (stopped || document.visibilityState !== "visible" || !navigator.onLine) return;
      void heartbeatPresenceAction().catch(() => undefined);
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, [ready, user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginAction(email, password);
    setSession(data.accessToken, data.user);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    void logoutAction().catch(() => undefined);
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async (input: { name: string; email: string; password: string }) => {
    const data = await registerAction(input);
    setSession(data.accessToken, data.user);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({ user, token, ready, login, register, logout }),
    [user, token, ready, login, register, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      token: null,
      ready: false,
      login: async () => {
        throw new Error("AuthProvider manquant");
      },
      register: async () => {
        throw new Error("AuthProvider manquant");
      },
      logout: () => undefined,
    } satisfies AuthContextValue;
  }
  return ctx;
}
