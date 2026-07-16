"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: string;
  hint?: string;
}

interface StatStripProps {
  stats: StatItem[];
  isLoading?: boolean;
  className?: string;
}

/**
 * A flat row of figures separated by hairlines: the instrument-panel
 * replacement for icon KPI cards. 2-up on mobile, one row on desktop.
 */
export function StatStrip({ stats, isLoading = false, className }: StatStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900",
        stats.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
        className
      )}
    >
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            "border-neutral-100 px-4 py-3 dark:border-neutral-850",
            i % 2 === 1 && "border-l",
            i >= 2 && "border-t lg:border-t-0",
            i > 0 ? "lg:border-l" : "lg:border-l-0"
          )}
        >
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</div>
          {isLoading ? (
            <Skeleton className="mt-1.5 h-6 w-20" />
          ) : (
            <div className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{stat.value}</div>
          )}
          {stat.hint && !isLoading && (
            <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">{stat.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}
