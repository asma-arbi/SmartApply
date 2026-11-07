import { Suspense } from "react";
import { EditPost } from "@/components/posts/edit-post";
import { Skeleton } from "@/components/ui/skeleton";

async function EditPostContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditPost id={id} />;
}

export default function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-80 w-full" />
        </div>
      }
    >
      <EditPostContent params={params} />
    </Suspense>
  );
}
