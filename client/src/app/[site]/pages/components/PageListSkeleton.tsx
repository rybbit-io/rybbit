"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PageListSkeletonProps = {
  count?: number;
};

export function PageListSkeleton({ count = 5 }: PageListSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="w-full mb-3">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
              {/* Left side: Page title/path with thumbnail skeleton */}
              <div className="flex gap-3 flex-1 min-w-0">
                {/* Thumbnail skeleton - conditionally shown like in PageListItem */}
                <div className="hidden sm:block shrink-0 h-12 w-16 relative rounded-md overflow-hidden border border-neutral-100 dark:border-neutral-800">
                  <Skeleton className="w-full h-full" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-64" />
                    <Skeleton className="h-4 w-4" /> {/* External link icon skeleton */}
                  </div>
                  <Skeleton className="h-4 w-48 mt-1" />
                </div>
              </div>

              {/* Right side: Sparkline and session count/duration skeleton */}
              <div className="flex items-center gap-0 w-full md:w-auto">
                {/* Sparkline chart placeholder */}
                <div className="h-12 w-40">
                  <Skeleton className="h-full w-full rounded-md" />
                </div>

                {/* Session count and duration placeholder */}
                <div className="text-right min-w-[120px]">
                  {/* Sessions count */}
                  <div className="mb-1">
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
                  {/* Average time */}
                  <div>
                    <Skeleton className="h-5 w-16 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
