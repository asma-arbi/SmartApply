"use client";

import { Suspense } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { CompanyWorkspace } from "@/components/company/company-workspace";
import { PostListSkeleton } from "@/components/posts/post-list";

export default function CompanyPage() {
  return (
    <RoleGate allow={["COMPANY"]}>
      <Suspense fallback={<PostListSkeleton />}>
        <CompanyWorkspace />
      </Suspense>
    </RoleGate>
  );
}