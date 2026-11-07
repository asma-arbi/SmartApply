import { Skeleton } from "@/components/ui/skeleton";

export default function EditPostLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
