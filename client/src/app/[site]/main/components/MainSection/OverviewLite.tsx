"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatSecondsAsMinutesAndSeconds } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import {
  useGetOverviewBucketedLite,
  useGetOverviewLite,
} from "../../../../../api/analytics/hooks/useGetOverviewLite";
import { StatType, useStore } from "../../../../../lib/store";
import { SparklinesChart } from "./SparklinesChart";

// Lite variant of Overview: no previous-period queries, no comparison arrows.
// Backed by MV endpoints; ~10x fewer ClickHouse rows scanned per render.

const Stat = ({
  title,
  id,
  value,
  valueFormatter,
  isLoading,
  decimals,
  postfix,
}: {
  title: string;
  id: StatType;
  value: number;
  valueFormatter?: (value: number) => string;
  isLoading: boolean;
  decimals?: number;
  postfix?: string;
}) => {
  const { selectedStat, setSelectedStat, site, bucket, time } = useStore();
  const [isHovering, setIsHovering] = useState(false);

  const { data } = useGetOverviewBucketedLite({ site, bucket });

  const sparklinesData =
    data?.data
      ?.filter(d => {
        if (time.mode === "past-minutes") {
          const timestamp = new Date(d.time);
          const now = new Date();
          const startTime = new Date(now.getTime() - time.pastMinutesStart * 60 * 1000);
          return timestamp >= startTime && timestamp <= now;
        }
        return true;
      })
      .map((d: any) => ({ value: d[id], time: d.time })) ?? [];

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
            <Skeleton className="w-[60px] h-9 rounded-md" />
          ) : valueFormatter ? (
            valueFormatter(value)
          ) : (
            <span>
              <Tooltip>
                <TooltipTrigger>
                  <NumberFlow
                    respectMotionPreference={false}
                    value={decimals ? Number(value.toFixed(decimals)) : value}
                    format={{ notation: "compact" }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <NumberFlow
                    respectMotionPreference={false}
                    value={decimals ? Number(value.toFixed(decimals)) : value}
                    format={{ notation: "standard" }}
                  />
                  {postfix && <span>{postfix}</span>}
                </TooltipContent>
              </Tooltip>
              {postfix && <span>{postfix}</span>}
            </span>
          )}
        </div>
      </div>
      <div className="h-[40px] -mt-4">
        <SparklinesChart data={sparklinesData} isHovering={isHovering} />
      </div>
    </div>
  );
};

export function OverviewLite() {
  const { site } = useStore();
  const t = useExtracted();

  const { data: overviewData, isLoading } = useGetOverviewLite(site);

  const users = overviewData?.data?.users ?? 0;
  const sessions = overviewData?.data?.sessions ?? 0;
  const pageviews = overviewData?.data?.pageviews ?? 0;
  const pagesPerSession = overviewData?.data?.pages_per_session ?? 0;
  const bounceRate = overviewData?.data?.bounce_rate ?? 0;
  const sessionDuration = overviewData?.data?.session_duration ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 items-center">
      <Stat title={t("Unique Users")} id="users" value={users} isLoading={isLoading} />
      <Stat title={t("Sessions")} id="sessions" value={sessions} isLoading={isLoading} />
      <Stat title={t("Pageviews")} id="pageviews" value={pageviews} isLoading={isLoading} />
      <Stat
        title={t("Pages per Session")}
        id="pages_per_session"
        value={pagesPerSession}
        decimals={1}
        isLoading={isLoading}
      />
      <Stat
        title={t("Bounce Rate")}
        id="bounce_rate"
        value={bounceRate}
        isLoading={isLoading}
        postfix="%"
        decimals={1}
      />
      <Stat
        title={t("Session Duration")}
        id="session_duration"
        value={sessionDuration}
        isLoading={isLoading}
        valueFormatter={formatSecondsAsMinutesAndSeconds}
      />
    </div>
  );
}
