"use client";

import { getTimezone } from "@/lib/store";
import NumberFlow from "@number-flow/react";
import { Info } from "lucide-react";
import { DateTime } from "luxon";
import { memo } from "react";
import { OutboundLink } from "../../../../api/analytics/endpoints";
import { Favicon } from "../../../../components/Favicon";
import { cn, truncateUrl } from "../../../../lib/utils";
import { ScrollArea } from "../../../../components/ui/scroll-area";

// Skeleton component for OutboundLinksList
const OutboundLinksListSkeleton = memo(({ size = "small" }: { size?: "small" | "large" }) => {
  // Generate widths following Pareto principle with top item at 100%
  const widths = Array.from({ length: 10 }, (_, i) => {
    if (i === 0) {
      return 100;
    } else if (i === 1) {
      return 60 + Math.random() * 20;
    } else {
      const factor = 1 - (i - 2) / 8;
      return 10 + factor * 30;
    }
  });

  const labelWidths = Array.from({ length: 10 }, (_, i) => {
    return i < 3 ? 150 + Math.random() * 100 : 80 + Math.random() * 120;
  });

  const valueWidths = Array.from({ length: 10 }, () => 20 + Math.random() * 40);

  return (
    <div className="flex flex-col gap-2 pr-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className={cn("relative flex items-center", size === "small" ? "h-6" : "h-9")}>
          <div
            className="absolute inset-0 bg-neutral-150/50 dark:bg-neutral-800 py-2 rounded-md animate-pulse"
            style={{ width: `${widths[index]}%` }}
          ></div>
          <div
            className={cn(
              "z-5 mx-2 flex justify-between items-center w-full",
              size === "small" ? "text-xs" : "text-sm"
            )}
          >
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mr-1"></div>
              <div
                className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse"
                style={{ width: `${labelWidths[index]}px` }}
              ></div>
            </div>
            <div className={cn("flex gap-2", size === "small" ? "text-xs" : "text-sm")}>
              <div
                className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse"
                style={{ width: `${valueWidths[index]}px` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

interface OutboundLinksListProps {
  outboundLinks: OutboundLink[];
  isLoading: boolean;
  size?: "small" | "large";
}

export function OutboundLinksList({ outboundLinks, isLoading, size = "small" }: OutboundLinksListProps) {
  if (isLoading) {
    return <OutboundLinksListSkeleton size={size} />;
  }

  if (!outboundLinks || outboundLinks.length === 0) {
    return (
      <div className="text-neutral-500 dark:text-neutral-300 w-full text-center mt-6 flex flex-row gap-2 items-center justify-center">
        <Info className="w-5 h-5" />
        No Data
      </div>
    );
  }

  // Find the total count to calculate percentages
  const totalCount = outboundLinks.reduce((sum, link) => sum + link.count, 0);
  const maxCount = Math.max(...outboundLinks.map(link => link.count));

  return (
    <ScrollArea className="h-[394px]">
      <div className="flex flex-col gap-2 pr-2 overflow-x-hidden">
        {outboundLinks.map((link, index) => {
          const percentageOfMax = (link.count / maxCount) * 100;
          const percentage = (link.count / totalCount) * 100;
          const lastClicked = DateTime.fromSQL(link.lastClicked, {
            zone: "utc",
          }).setZone(getTimezone());

          return (
            <div
              key={`${link.url}-${index}`}
              className={cn(
                "relative flex items-center hover:bg-neutral-100 dark:hover:bg-neutral-850 group px-2 rounded-md",
                size === "small" ? "h-6" : "h-9"
              )}
            >
              <div
                className="absolute inset-0 bg-dataviz py-2 opacity-25 rounded-md"
                style={{ width: `${percentageOfMax}%` }}
              ></div>
              <div
                className={cn(
                  "z-10 flex justify-between items-center w-full",
                  size === "small" ? "text-xs" : "text-sm"
                )}
              >
                <div className="font-medium truncate max-w-[70%] flex items-center gap-1">
                  <Favicon domain={new URL(link.url).hostname} className="w-4 mr-1" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-900 dark:text-neutral-100 hover:underline truncate"
                    title={link.url}
                  >
                    {truncateUrl(link.url)}
                  </a>
                </div>
                <div className={cn("text-sm flex gap-2 items-center", size === "small" ? "text-xs" : "text-sm")}>
                  <div className="hidden group-hover:block text-neutral-600 dark:text-neutral-400 text-xs">
                    {Math.round(percentage * 10) / 10}%
                  </div>
                  {/* <div className="hidden group-hover:block text-neutral-600 dark:text-neutral-400 text-xs">
                    {lastClicked.toRelative()}
                  </div> */}
                  <NumberFlow respectMotionPreference={false} value={link.count} format={{ notation: "compact" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
