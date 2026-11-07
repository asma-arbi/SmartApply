import { Suspense } from "react";
import { CompanyProfilePage } from "@/components/company/company-profile-page";
import { PostListSkeleton } from "@/components/posts/post-list";

async function CompanyProfileContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyProfilePage companyId={id} />;
}

export default function EntreprisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PostListSkeleton />}>
      <CompanyProfileContent params={params} />
    </Suspense>
  );
}
