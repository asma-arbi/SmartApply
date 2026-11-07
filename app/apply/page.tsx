"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { homeForRole, isCandidateRole } from "@/lib/roles";
import { LetterStudio } from "@/components/letters/letter-studio";

export default function ApplyPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login?next=/apply");
      return;
    }
    if (!isCandidateRole(user.role)) router.replace(homeForRole(user.role));
  }, [ready, router, user]);

  if (!ready || !user || !isCandidateRole(user.role)) {
    return <p className="text-sm text-muted-foreground">Chargement du studio…</p>;
  }

  return <LetterStudio />;
}
