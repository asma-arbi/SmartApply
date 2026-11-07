import { Suspense } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { AdminPosts } from "@/components/admin/admin-posts";

export default function AdminPostsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Chargement des publications…</div>}>
      <RoleGate allow={["ADMIN"]}>
        <AdminPosts />
      </RoleGate>
    </Suspense>
  );
}
