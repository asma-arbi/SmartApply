"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { homeForRole } from "@/lib/roles";
import type { UserRole } from "@/types/post";

export function RoleGate({
  allow,
  children,
}: {
  allow: UserRole[];
  children: ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = allow.join(",");
  const hadUser = useRef(false);

  if (user) hadUser.current = true;

  useEffect(() => {
    if (!ready) return;
    const roles = allowed.split(",") as UserRole[];

    if (!user) {
      // Avoid bounce login↔company when a transient 401 briefly clears React state.
      const delay = hadUser.current ? 600 : 0;
      const timer = window.setTimeout(() => {
        if (!hadUser.current || !window.localStorage.getItem("smartapply-auth-token")) {
          router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
        }
      }, delay);
      return () => window.clearTimeout(timer);
    }

    if (!roles.includes(user.role)) {
      router.replace(homeForRole(user.role));
    }
  }, [allowed, pathname, ready, router, user]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }
  if (!user || !allow.includes(user.role)) {
    return <p className="text-sm text-muted-foreground">Redirection…</p>;
  }
  return children;
}
