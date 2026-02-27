import React from "react";
import { cn } from "@/lib/utils";
import { getTimezone } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateTime } from "luxon";
import { useMonitorUptimeBuckets } from "@/api/uptime/monitors";

interface UptimeBarProps {
  monitorId: number;
  className?: string;
}

export function UptimeBar({ monitorId, className }: UptimeBarProps) {
  const { data, isLoading } = useMonitorUptimeBuckets(monitorId, {
    bucket: "day",
    days: 7,
  });

  if (isLoading) {
    return (
      <div className={cn("flex gap-1 h-6", className)}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-[10px] rounded-md bg-neutral-150 dark:bg-neutral-600 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.buckets) {
    return null;
  }
  // Process bucket data
  const days = data.buckets.map(bucket => {
    const date = DateTime.fromSQL(bucket.bucket_time).setZone(getTimezone());
    return {
      date: bucket.bucket_formatted,
      dateFormatted: date.toFormat("MMM dd"),
      dayOfWeek: date.toFormat("ccc"),
      totalChecks: bucket.total_checks,
      successCount: bucket.successful_checks,
      failureCount: bucket.failed_checks,
      timeoutCount: bucket.timeout_checks,
      uptimePercentage: bucket.uptime_percentage,
    };
  });

  return (
    <TooltipProvider>
      <div className={cn("flex gap-1 h-6", className)}>
        {days.map(day => {
          const totalChecks = day.totalChecks;
          const hasIssues = day.failureCount > 0 || day.timeoutCount > 0;
          const uptimePercentage = day.uptimePercentage.toFixed(1);

          let barColor = "bg-green-500";
          if (totalChecks === 0) {
            barColor = "bg-neutral-300 dark:bg-neutral-600";
          } else if (day.failureCount > 0 || day.timeoutCount > 0) {
            const issuePercentage = (day.failureCount + day.timeoutCount) / totalChecks;
            if (issuePercentage >= 0.5) barColor = "bg-red-500";
            else if (issuePercentage >= 0.1) barColor = "bg-orange-500";
            else barColor = "bg-yellow-500";
          }
          if (totalChecks === 0) {
            return (
              <div
                key={day.date}
                className={cn("w-[10px] rounded-md cursor-pointer transition-opacity hover:opacity-80", barColor)}
              />
            );
          }

          return (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  className={cn("w-[10px] rounded-md cursor-pointer transition-opacity hover:opacity-80", barColor)}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{uptimePercentage}%</div>
                    <div className="text-neutral-300">{day.dateFormatted}</div>
                  </div>
                  {totalChecks > 0 ? (
                    <>
                      <div className="text-xs text-neutral-300">
                        <span className="text-green-400">{day.successCount}</span> /{" "}
                        <span className="text-red-400">{day.failureCount}</span> /{" "}
                        <span className="text-orange-400">{day.timeoutCount}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-neutral-300 mt-1">No data</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
