"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ErrorListSkeletonProps = {
  count?: number;
};

export function ErrorListSkeleton({ count = 5 }: ErrorListSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="w-full mb-3">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
              {/* Left side: Error name */}
              <div className="flex-1 min-w-0">
                <Skeleton className="h-6 w-64" />
              </div>

              {/* Right side: Error statistics */}
              <div className="flex items-center gap-6 w-full md:w-auto">
                {/* Occurrences */}
                <div className="text-center min-w-[80px]">
                  <Skeleton className="h-4 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </div>

                {/* Sessions */}
                <div className="text-center min-w-[80px]">
                  <Skeleton className="h-4 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>

                {/* Percentage */}
                <div className="text-center min-w-[60px]">
                  <Skeleton className="h-4 w-10 mx-auto" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
