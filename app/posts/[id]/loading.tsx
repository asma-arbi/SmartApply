import { Skeleton } from "@/components/ui/skeleton";

export default function PostDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-10 w-4/5" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
