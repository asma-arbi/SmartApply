import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--sa-header-h))] w-full flex-1 items-center justify-center">
      <Suspense
        fallback={
          <p className="text-sm text-[var(--sa-text-secondary)]">Chargement…</p>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
