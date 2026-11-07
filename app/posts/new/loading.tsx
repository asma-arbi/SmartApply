import { Skeleton } from "@/components/ui/skeleton";

export default function NewPostLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-16">
      <Skeleton className="h-5 w-32" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
