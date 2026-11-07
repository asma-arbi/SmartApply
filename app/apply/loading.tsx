import { Skeleton } from "@/components/ui/skeleton";

export default function ApplyLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
