"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { canCreatePosts, homeForRole } from "@/lib/roles";

/**
 * Same UX as the feed: open the Signal composer on the role home.
 * Keeps one design system (PostComposer modal) for company + candidate.
 */
export default function NewPostPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const allowed = canCreatePosts(user?.role);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login?next=/posts/new");
      return;
    }
    if (!allowed) {
      router.replace(homeForRole(user.role));
      return;
    }
    const home = homeForRole(user.role);
    const sep = home.includes("?") ? "&" : "?";
    router.replace(`${home}${sep}compose=1`);
  }, [allowed, ready, router, user]);

  return (
    <div className="sa-feed-shell flex min-h-[40vh] items-center justify-center px-4 py-16">
      <p className="text-sm text-[var(--sa-text-secondary)]">Ouverture du composer…</p>
    </div>
  );
}
