import { Skeleton } from "@/components/ui/skeleton";
import { memo, useMemo } from "react";

import { cn } from "../../../lib/utils";

export const SessionDetailsTimelineSkeleton = memo(
  ({ itemCount }: { itemCount: number }) => {
    // Generate stable random widths for timeline items
    const itemWidths = useMemo(() => {
      const widths = ["w-32", "w-48", "w-56", "w-64", "w-72", "w-80", "w-96"];
      return Array.from({ length: Math.min(itemCount, 100) }).map(() => ({
        content: widths[Math.floor(Math.random() * widths.length)],
        hasSecondary: Math.random() > 0.5,
        secondaryWidth: Math.random() > 0.5 ? "w-24" : "w-16",
      }));
    }, [itemCount]);

    return (
      <div className="mt-4">
        {/* Header: Tabs and View User button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-md">
            <Skeleton className="h-7 w-20 rounded-sm" />
            <Skeleton className="h-7 w-24 rounded-sm" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* EventTypeFilter skeleton */}
        <div className="flex items-center space-x-2 mb-4">
          <Skeleton className="h-7 w-24 rounded" />
          <Skeleton className="h-7 w-28 rounded" />
          <Skeleton className="h-7 w-20 rounded" />
          <Skeleton className="h-7 w-28 rounded" />
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="h-7 w-24 rounded" />
          <Skeleton className="h-7 w-28 rounded" />
        </div>

        {/* Timeline items skeleton */}
        <div className="mb-4 px-1">
          {itemWidths.map((item, i) => (
            <div key={i} className="flex mb-3">
              {/* Timeline circle with connecting line */}
              <div className="relative shrink-0">
                {i < itemWidths.length - 1 && (
                  <div
                    className="absolute top-8 left-4 w-px bg-neutral-200 dark:bg-neutral-600/25"
                    style={{ height: "calc(100% - 20px)" }}
                  />
                )}
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>

              <div className="flex flex-col ml-3 flex-1">
                <div className="flex items-center flex-1 py-1">
                  {/* Event type icon */}
                  <Skeleton className="h-4 w-4 shrink-0 mr-3 rounded" />

                  {/* Content */}
                  <Skeleton className={cn("h-4 mr-4", item.content)} />

                  {/* Timestamp */}
                  <Skeleton className="h-3 w-16 shrink-0 ml-auto" />
                </div>

                {/* Secondary content (duration/props) */}
                {item.hasSecondary && (
                  <div className="flex items-center pl-7 mt-1">
                    <Skeleton className={cn("h-3", item.secondaryWidth)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
