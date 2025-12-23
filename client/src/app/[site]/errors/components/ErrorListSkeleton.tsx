"use client";

import { Skeleton } from "@/components/ui/skeleton";

type ErrorListSkeletonProps = {
  count?: number;
};

export function ErrorListSkeleton({ count = 5 }: ErrorListSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="mb-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
          <div className="p-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
              {/* Left side: Error name and message */}
              <div className="flex-1 min-w-0 space-y-1">
                <Skeleton className="h-4 w-32" /> {/* Error name (e.g., "TypeError") */}
                <Skeleton className="h-3 w-full max-w-[500px]" /> {/* Error message */}
              </div>

              {/* Right side: Sparkline chart and error statistics */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                {/* Sparkline chart */}
                <div className="h-12 w-56">
                  <Skeleton className="h-full w-full rounded" />
                </div>

                {/* Error statistics */}
                <div className="flex items-center">
                  {/* Occurrences */}
                  <div className="text-center min-w-[80px]">
                    <div className="mb-1">
                      <Skeleton className="h-5 w-10 mx-auto" /> {/* Count number */}
                    </div>
                    <div>
                      <Skeleton className="h-3 w-16 mx-auto" /> {/* "occurrences" text */}
                    </div>
                  </div>

                  {/* Sessions affected */}
                  <div className="text-center min-w-[80px]">
                    <div className="mb-1">
                      <Skeleton className="h-5 w-8 mx-auto" /> {/* Session count */}
                    </div>
                    <div>
                      <Skeleton className="h-3 w-12 mx-auto" /> {/* "sessions" text */}
                    </div>
                  </div>

                  {/* Expand/Collapse icon */}
                  <div className="ml-2 shrink-0">
                    <Skeleton className="h-4 w-4" /> {/* Chevron icon */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
