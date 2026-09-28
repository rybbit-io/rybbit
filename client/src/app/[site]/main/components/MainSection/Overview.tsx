"use client";

import { ValueFlash, type ValueFlashProps } from "@/components/interior/value-flash";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatSecondsAsMinutesAndSeconds } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { AlertCircle, ArrowDown, ArrowUp, ChevronDown, ChevronUp, RefreshCcw } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useGetOverview } from "../../../../../api/analytics/hooks/useGetOverview";
import { useGetOverviewBucketed } from "../../../../../api/analytics/hooks/useGetOverviewBucketed";
import { StatType, useComparisonEnabled, useStore, useTimezone } from "../../../../../lib/store";
import { SparklinesChart } from "./SparklinesChart";

const COMPACT = { notation: "compact" } as const;
const STANDARD = { notation: "standard" } as const;
// The tile's text as NumberFlow renders it (same default locale), so a change that rounding hides
// ("12K" → "12K") doesn't flash.
const compactNumber = new Intl.NumberFormat(undefined, COMPACT);

type FlashInputs = Pick<ValueFlashProps, "resetKey" | "ready" | "fetching" | "empty">;

export const ChangePercentage = ({
  current,
  previous,
  reverseColor,
}: {
  current: number;
  previous: number;
  reverseColor?: boolean;
}) => {
  const comparisonEnabled = useComparisonEnabled();
  const change = ((current - previous) / previous) * 100;

  // Nothing to compare against: a delta here would be a percentage of a period
  // the user has explicitly stopped asking for.
  if (!comparisonEnabled) return null;

  if (previous === 0) {
    if (current === 0) {
      return <div className="text-sm">0%</div>;
    }
    return <div className="text-sm">+999%</div>;
  }

  if (change === 0) {
    return <div className="text-sm">0%</div>;
  }

  return (
    <div
      className={cn(
        "text-xs flex items-center gap-0.5",
        (reverseColor ? -change : change) > 0 ? "text-green-400" : "text-red-400"
      )}
    >
      {change > 0 ? <ArrowUp className="w-3 h-3" strokeWidth={3} /> : <ArrowDown className="w-3 h-3" strokeWidth={3} />}
      {Math.abs(change).toFixed(1)}%
    </div>
  );
};

const Stat = ({
  title,
  id,
  value,
  previous,
  valueFormatter,
  isLoading,
  decimals,
  postfix,
  reverseColor,
  flash,
}: {
  title: string;
  id: StatType;
  value: number;
  // Undefined when there is no comparison to draw: turned off, or the previous period failed to load.
  previous: number | undefined;
  valueFormatter?: (value: number) => string;
  isLoading: boolean;
  decimals?: number;
  postfix?: string;
  reverseColor?: boolean;
  flash: FlashInputs;
}) => {
  const { selectedStat, setSelectedStat, site, bucket, time } = useStore();
  const [isHovering, setIsHovering] = useState(false);
  const displayValue = decimals ? Number(value.toFixed(decimals)) : value;

  // Consolidated bucketed data for sparklines - automatically handles both modes
  const { data } = useGetOverviewBucketed({
    site,
    bucket,
  });

  // Filter and format sparklines data
  const sparklinesData =
    data
      ?.filter(d => {
        // For past-minutes mode, ensure we only show data within the specified time range
        if (time.mode === "past-minutes") {
          const timestamp = new Date(d.time);
          const now = new Date();
          const startTime = new Date(now.getTime() - time.pastMinutesStart * 60 * 1000);
          return timestamp >= startTime && timestamp <= now;
        }
        return true;
      })
      .map((d: any) => ({
        value: d[id],
        time: d.time,
      })) ?? [];

  return (
    <div
      className={cn(
        "flex flex-col cursor-pointer border-r border-neutral-100 dark:border-neutral-800 last:border-r-0 text-nowrap",
        selectedStat === id && "bg-neutral-0 dark:bg-neutral-850"
      )}
      onClick={() => setSelectedStat(id)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex flex-col px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground">{title}</div>
        <div className="text-2xl font-medium flex gap-2 items-center justify-between">
          {isLoading ? (
            <>
              <Skeleton className="w-[60px] h-9 rounded-md" />
              <Skeleton className="w-[50px] h-5 rounded-md" />
            </>
          ) : (
            <>
              {valueFormatter ? (
                <ValueFlash value={value} format={valueFormatter} invert={reverseColor} {...flash}>
                  {valueFormatter(value)}
                </ValueFlash>
              ) : (
                <ValueFlash value={displayValue} format={compactNumber.format} invert={reverseColor} {...flash}>
                  <Tooltip>
                    <TooltipTrigger>
                      <NumberFlow value={displayValue} format={COMPACT} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <NumberFlow value={displayValue} format={STANDARD} />
                      {postfix && <span>{postfix}</span>}
                    </TooltipContent>
                  </Tooltip>
                  {postfix && <span>{postfix}</span>}
                </ValueFlash>
              )}
              {previous !== undefined && (
                <ChangePercentage current={value} previous={previous} reverseColor={reverseColor} />
              )}
            </>
          )}
        </div>
      </div>
      <div className="h-[40px] -mt-4">
        <SparklinesChart data={sparklinesData} isHovering={isHovering} />
      </div>
    </div>
  );
};

export function Overview() {
  const { site, time, filters, bucket } = useStore();
  const timeZone = useTimezone();
  const t = useExtracted();

  // Current period - automatically handles both regular time-based and past-minutes queries
  const {
    data: overviewData,
    isFetching: isOverviewFetching,
    isLoading: isOverviewLoading,
    isPlaceholderData: isOverviewPlaceholder,
    error: overviewError,
    refetch: refetchOverview,
  } = useGetOverview({
    site,
  });

  // Previous period - automatically handles both regular time-based and past-minutes queries
  const { data: overviewDataPrevious, isLoading: isOverviewLoadingPrevious } = useGetOverview({
    site,
    periodTime: "previous",
  });

  // A failed load is not zero traffic: say so rather than render a row of zeros.
  if (overviewError && !overviewData) {
    return (
      <OverviewError
        message={overviewError.message || t("An error occurred while fetching data")}
        onRetry={() => void refetchOverview()}
      />
    );
  }

  const isLoading = isOverviewLoading || isOverviewLoadingPrevious;

  // Tiles flash only when a background refetch of the same question moves a number: never on first
  // paint, never on a site/range/filter/bucket change, never while the previous range's numbers stand in.
  const flash: FlashInputs = {
    resetKey: JSON.stringify([site, time, filters, bucket, timeZone]),
    ready: overviewData !== undefined && !isOverviewPlaceholder,
    fetching: isOverviewFetching,
    // No sessions means every tile reads 0 for want of data. The first data after that (a new site's
    // first pageview, which refetches this same query) is a first paint, not a rise.
    empty: !overviewData?.sessions,
  };

  const currentUsers = overviewData?.users ?? 0;
  const currentSessions = overviewData?.sessions ?? 0;
  const currentPageviews = overviewData?.pageviews ?? 0;
  const currentPagesPerSession = overviewData?.pages_per_session ?? 0;
  const currentBounceRate = overviewData?.bounce_rate ?? 0;
  const currentSessionDuration = overviewData?.session_duration ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 items-center">
      <Stat
        title={t("Unique Users")}
        id="users"
        value={currentUsers}
        previous={overviewDataPrevious?.users}
        isLoading={isLoading}
        flash={flash}
      />
      <Stat
        title={t("Sessions")}
        id="sessions"
        value={currentSessions}
        previous={overviewDataPrevious?.sessions}
        isLoading={isLoading}
        flash={flash}
      />
      <Stat
        title={t("Pageviews")}
        id="pageviews"
        value={currentPageviews}
        previous={overviewDataPrevious?.pageviews}
        isLoading={isLoading}
        flash={flash}
      />
      <Stat
        title={t("Pages per Session")}
        id="pages_per_session"
        value={currentPagesPerSession}
        previous={overviewDataPrevious?.pages_per_session}
        decimals={1}
        isLoading={isLoading}
        flash={flash}
      />
      <Stat
        title={t("Bounce Rate")}
        id="bounce_rate"
        value={currentBounceRate}
        previous={overviewDataPrevious?.bounce_rate}
        isLoading={isLoading}
        postfix="%"
        decimals={1}
        reverseColor={true}
        flash={flash}
      />
      <Stat
        title={t("Session Duration")}
        id="session_duration"
        value={currentSessionDuration}
        previous={overviewDataPrevious?.session_duration}
        isLoading={isLoading}
        valueFormatter={formatSecondsAsMinutesAndSeconds}
        flash={flash}
      />
    </div>
  );
}

// Takes the stat row's place when the current period fails to load; as tall as one row of tiles.
function OverviewError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useExtracted();

  return (
    <div className="flex min-h-[88px] flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
      <AlertCircle className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
      <span className="font-medium text-neutral-900 dark:text-neutral-100">{t("Failed to load stats")}</span>
      <span className="text-neutral-500 dark:text-neutral-400">{message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCcw />
        {t("Try Again")}
      </Button>
    </div>
  );
}
