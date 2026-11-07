"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function SpaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const showMobileNav =
    ready &&
    Boolean(user) &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/apply");

  return (
    <div
      suppressHydrationWarning
      className={cn(
        "flex min-h-0 flex-1 flex-col bg-[var(--sa-page)]",
        showMobileNav && "sa-has-mobile-nav",
      )}
    >
      {children}
    </div>
  );
}
