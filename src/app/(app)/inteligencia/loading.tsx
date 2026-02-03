import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-4 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[70vh] flex-col gap-4">
          <div className="flex-1 space-y-5 overflow-hidden rounded-lg border bg-background p-4">
            <div className="flex justify-end">
              <Skeleton className="h-16 w-[55%] rounded-2xl" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-20 w-[60%] rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-12 w-[40%] rounded-2xl" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-24 w-[65%] rounded-2xl" />
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3">
              <Skeleton className="h-10 w-full" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-9 w-28 rounded-full" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
