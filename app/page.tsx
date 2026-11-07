import { Suspense } from "react";
import { CandidateHome } from "@/components/home/candidate-home";
import { PostListSkeleton } from "@/components/posts/post-list";
import { ConnectivityFallback } from "@/components/pwa/connectivity-fallback";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <>
          <PostListSkeleton />
          <ConnectivityFallback label="annonces" />
        </>
      }
    >
      <CandidateHome />
    </Suspense>
  );
}