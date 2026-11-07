"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

/** Legacy URL — unified create form lives at /posts/new */
export default function CompanyNewPostRedirect() {
  const router = useRouter();
  const { ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    router.replace("/posts/new");
  }, [ready, router]);

  return (
    <div className="mx-auto max-w-2xl py-16 text-center text-sm text-muted-foreground">
      Redirection vers le formulaire de publication…
    </div>
  );
}
