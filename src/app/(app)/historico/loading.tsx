import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div>
        <Skeleton variant="shimmer" className="h-4 w-48 mb-2" />
        <Skeleton variant="shimmer" className="h-8 w-64 mb-1" />
        <Skeleton variant="shimmer" className="h-4 w-80" />
      </div>

      {/* Search skeleton */}
      <Skeleton variant="shimmer" className="h-10 w-full max-w-md" />

      {/* Filter card skeleton */}
      <Card>
        <CardHeader>
          <Skeleton variant="shimmer" className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton variant="shimmer" className="h-10" />
            <Skeleton variant="shimmer" className="h-10" />
            <Skeleton variant="shimmer" className="h-10" />
            <Skeleton variant="shimmer" className="h-10" />
          </div>
          <Skeleton variant="shimmer" className="h-10 w-full mt-3" />
        </CardContent>
      </Card>

      {/* Table skeleton */}
      <SkeletonTable rows={10} columns={7} />
    </div>
  );
}
