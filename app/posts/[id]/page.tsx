import { Suspense } from "react";
import { PostDetail } from "@/components/posts/post-detail";
import { Skeleton } from "@/components/ui/skeleton";

async function PostDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostDetail id={id} />;
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <PostDetailContent params={params} />
    </Suspense>
  );
}
