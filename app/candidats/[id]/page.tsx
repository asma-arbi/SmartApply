import { Suspense } from "react";
import { CandidateProfilePage } from "@/components/candidate/candidate-profile-page";
import { PostListSkeleton } from "@/components/posts/post-list";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CandidateProfilePage candidateId={id} />;
}

export default function CandidatPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PostListSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
