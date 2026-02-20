import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "shimmer";
}

export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        variant === "shimmer" ? "skeleton-base" : "animate-pulse",
        className
      )}
    />
  );
}

export function SkeletonText({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="shimmer"
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-4 w-24" />
        <Skeleton variant="shimmer" className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton variant="shimmer" className="h-8 w-32" />
      <Skeleton variant="shimmer" className="h-3 w-20" />
    </div>
  );
}

export function SkeletonKPI({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 space-y-3 animate-fade-in-up",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="shimmer" className="h-10 w-10 rounded-lg" />
        <Skeleton variant="shimmer" className="h-4 w-24" />
      </div>
      <Skeleton variant="shimmer" className="h-9 w-28" />
      <div className="flex items-center gap-2">
        <Skeleton variant="shimmer" className="h-4 w-4 rounded" />
        <Skeleton variant="shimmer" className="h-3 w-16" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  className,
  rows = 5,
  columns = 4,
}: {
  className?: string;
  rows?: number;
  columns?: number;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="shimmer" className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4 px-4 py-3 animate-fade-in-up"
            style={{ animationDelay: `${rowIndex * 50}ms` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                variant="shimmer"
                className={cn(
                  "h-4 flex-1",
                  colIndex === 0 && "w-32 flex-none"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ className, type = "bar" }: { className?: string; type?: "bar" | "line" | "pie" }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton variant="shimmer" className="h-8 w-20 rounded-md" />
          <Skeleton variant="shimmer" className="h-8 w-20 rounded-md" />
        </div>
      </div>
      
      {type === "bar" && (
        <div className="flex items-end gap-2 h-48 pt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="shimmer"
              className="flex-1 rounded-t-md"
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          ))}
        </div>
      )}
      
      {type === "line" && (
        <div className="relative h-48">
          <Skeleton variant="shimmer" className="absolute inset-0 rounded-lg opacity-30" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
          <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
        </div>
      )}
      
      {type === "pie" && (
        <div className="flex items-center justify-center h-48">
          <Skeleton variant="shimmer" className="h-40 w-40 rounded-full" />
        </div>
      )}
      
      <div className="flex justify-center gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton variant="shimmer" className="h-3 w-3 rounded" />
            <Skeleton variant="shimmer" className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonForm({ className, fields = 4 }: { className?: string; fields?: number }) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div
          key={i}
          className="space-y-2 animate-fade-in-up"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <Skeleton variant="shimmer" className="h-3 w-20" />
          <Skeleton variant="shimmer" className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton variant="shimmer" className="h-10 w-24 rounded-lg" />
        <Skeleton variant="shimmer" className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };
  
  return (
    <Skeleton
      variant="shimmer"
      className={cn("rounded-full", sizeClasses[size], className)}
    />
  );
}

export function SkeletonList({ className, items = 5 }: { className?: string; items?: number }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border border-border animate-fade-in-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <SkeletonAvatar size="sm" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="shimmer" className="h-4 w-3/4" />
            <Skeleton variant="shimmer" className="h-3 w-1/2" />
          </div>
          <Skeleton variant="shimmer" className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="shimmer" className="h-8 w-64" />
          <Skeleton variant="shimmer" className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="shimmer" className="h-10 w-32 rounded-lg" />
          <Skeleton variant="shimmer" className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKPI key={i} className={`stagger-${i + 1}`} />
        ))}
      </div>
      
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonChart type="bar" />
        <SkeletonChart type="line" />
      </div>
      
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}

export function SkeletonPage({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)}>
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-8 w-48" />
        <Skeleton variant="shimmer" className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={3} columns={4} />
    </div>
  );
}
