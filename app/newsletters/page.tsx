import { Suspense } from "react";
import { Newspaper } from "lucide-react";
import { HubFeedPage } from "@/components/posts/hub-feed-page";
import { PostListSkeleton } from "@/components/posts/post-list";
import { ConnectivityFallback } from "@/components/pwa/connectivity-fallback";

export default function NewslettersPage() {
  return (
    <Suspense
      fallback={
        <>
          <PostListSkeleton />
          <ConnectivityFallback label="newsletters" />
        </>
      }
    >
      <HubFeedPage
        title="Newsletters recrutement"
        description="Actualités RH, conseils carrière et tendances du recrutement."
        category="RECRUITMENT_NEWS"
        emptyIcon={<Newspaper className="size-5" />}
        emptyTitle="Aucune newsletter"
        emptyDescription="Les posts « Actualité recrutement » publiés apparaîtront ici."
      />
    </Suspense>
  );
}

