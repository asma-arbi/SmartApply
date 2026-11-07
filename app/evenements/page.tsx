import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { HubFeedPage } from "@/components/posts/hub-feed-page";
import { PostListSkeleton } from "@/components/posts/post-list";
import { ConnectivityFallback } from "@/components/pwa/connectivity-fallback";

export default function EvenementsPage() {
  return (
    <Suspense
      fallback={
        <>
          <PostListSkeleton />
          <ConnectivityFallback label="événements" />
        </>
      }
    >
      <HubFeedPage
        title="Événements"
        description="Portes ouvertes, rencontres et événements professionnels à venir."
        category="OPEN_DAY"
        emptyIcon={<CalendarDays className="size-5" />}
        emptyTitle="Aucun événement"
        emptyDescription="Les posts « Portes ouvertes » publiés apparaîtront ici."
      />
    </Suspense>
  );
}

