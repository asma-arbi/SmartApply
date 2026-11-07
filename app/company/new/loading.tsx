import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyNewLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-16">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
