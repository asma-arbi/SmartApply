"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/login");
  const isStudio = pathname.startsWith("/apply");
  const isFeed =
    pathname === "/" ||
    pathname === "/posts" ||
    pathname.startsWith("/saved") ||
    pathname.startsWith("/company");

  return (
    <main
      suppressHydrationWarning
      className={cn(
        "mx-auto flex w-full flex-1 flex-col px-4",
        isLogin
          ? "max-w-none items-stretch justify-center py-0"
          : isStudio
            ? "max-w-6xl py-4 sm:py-6"
            : isFeed
              ? "max-w-[1128px] py-4 sm:py-6"
              : "max-w-5xl py-4 sm:py-6",
      )}
    >
      {children}
    </main>
  );
}
