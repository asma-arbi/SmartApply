"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { homeForRole } from "@/lib/roles";
import { CandidateFeed } from "@/components/candidate/candidate-feed";
import { PostListSkeleton } from "@/components/posts/post-list";

export function CandidateHome() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const browsingCatalog =
    searchParams.has("company") || searchParams.has("job") || searchParams.has("tag");

  useEffect(() => {
    if (!ready || !user) return;
    // Company/Admin may open the public feed to view an enterprise from sidebar "Voir".
    if ((user.role === "COMPANY" || user.role === "ADMIN") && !browsingCatalog) {
      router.replace(homeForRole(user.role));
    }
  }, [browsingCatalog, ready, router, user]);

  if (!ready) {
    return <PostListSkeleton />;
  }

  if ((user?.role === "COMPANY" || user?.role === "ADMIN") && !browsingCatalog) {
    return <PostListSkeleton />;
  }

  return <CandidateFeed />;
}
