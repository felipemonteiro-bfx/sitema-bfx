import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div>
        <Skeleton variant="shimmer" className="h-4 w-40 mb-2" />
        <Skeleton variant="shimmer" className="h-8 w-56 mb-1" />
        <Skeleton variant="shimmer" className="h-4 w-72" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-border pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="shimmer"
            className="h-9 w-28 rounded-md"
          />
        ))}
      </div>

      {/* Form card skeleton */}
      <Card>
        <CardHeader>
          <Skeleton variant="shimmer" className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton variant="shimmer" className="h-3 w-20" />
                <Skeleton variant="shimmer" className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton variant="shimmer" className="h-10 w-28 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Search skeleton */}
      <Skeleton variant="shimmer" className="h-10 w-full max-w-md" />

      {/* Table skeleton */}
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}
