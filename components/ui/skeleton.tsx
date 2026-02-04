import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function SkeletonSummaryCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChangeCard() {
  return (
    <div className="bg-white rounded-lg border-l-4 border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-4 pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function SkeletonReviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Skeleton */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-3 w-20 ml-auto" />
              <Skeleton className="h-4 w-28 ml-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Verdict Banner Skeleton */}
        <Skeleton className="h-20 w-full rounded-lg" />

        {/* Section Skeletons */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="space-y-3">
              <SkeletonChangeCard />
              <SkeletonChangeCard />
            </div>
          </div>
        ))}

        {/* Finalize Checklist Skeleton */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
              <Skeleton className="h-5 w-5 mt-0.5 rounded" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-4 border-t">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-48 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
