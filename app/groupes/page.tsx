import { Suspense } from "react";
import { Users } from "lucide-react";
import { HubFeedPage } from "@/components/posts/hub-feed-page";
import { GroupsCompaniesPanel } from "@/components/posts/groups-companies-panel";
import { PostListSkeleton } from "@/components/posts/post-list";
import { ConnectivityFallback } from "@/components/pwa/connectivity-fallback";

export default function GroupesPage() {
  return (
    <Suspense
      fallback={
        <>
          <PostListSkeleton />
          <ConnectivityFallback label="groupes" />
        </>
      }
    >
      <HubFeedPage
        title="Groupes & entreprises"
        description="Découvrez les entreprises, leurs actualités et leurs opportunités."
        category="COMPANY_ANNOUNCEMENT"
        emptyIcon={<Users className="size-5" />}
        emptyTitle="Aucune annonce entreprise"
        emptyDescription="Les publications COMPANY_ANNOUNCEMENT apparaîtront ici dès qu’elles sont publiées."
        headerExtra={<GroupsCompaniesPanel />}
      />
    </Suspense>
  );
}

