"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
