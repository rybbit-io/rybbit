"use client";
import NumberFlow from "@number-flow/react";
import { useExtracted } from "next-intl";
import { useMemo } from "react";
import { GetSitesFromOrgResponse } from "@/api/admin/endpoints/sites";
import { BucketSelection } from "@/components/BucketSelection";
import { Card, CardContent, CardLoader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatSecondsAsMinutesAndSeconds } from "@/lib/utils";
import { StatType, useStore } from "@/lib/store";
import { useRollupBucketed } from "../../hooks/useRollupBucketed";
import { useRollupOverview } from "../../hooks/useRollupOverview";
import { Chart } from "./Chart";

type SiteRow = GetSitesFromOrgResponse["sites"][number];

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
  const { selectedStat, setSelectedStat } = useStore();
  return (
    <div
      className={cn(
        "flex flex-col cursor-pointer border-r border-neutral-100 dark:border-neutral-800 last:border-r-0 text-nowrap",
        selectedStat === id && "bg-neutral-0 dark:bg-neutral-850"
      )}
      onClick={() => setSelectedStat(id)}
    >
      <div className="flex flex-col px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground">{title}</div>
        <div className="text-2xl font-medium flex gap-2 items-center">
          {isLoading ? (
            <Skeleton className="w-[60px] h-9 rounded-md" />
          ) : valueFormatter ? (
            <span>{valueFormatter(value)}</span>
          ) : (
            <span>
              <NumberFlow
                respectMotionPreference={false}
                value={decimals ? Number(value.toFixed(decimals)) : value}
                format={{ notation: "compact" }}
              />
              {postfix && <span>{postfix}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export function MainSection({
  siteIds,
  sites,
  siteColorMap,
  lite = false,
}: {
  siteIds: number[];
  sites: SiteRow[];
  siteColorMap: Map<number, string>;
  lite?: boolean;
}) {
  const t = useExtracted();
  const { selectedStat, bucket, time } = useStore();

  const { series, isFetching, isLoading } = useRollupBucketed({
    siteIds,
    bucket,
    lite,
  });
  // Stat cards read range totals; the chart reads the bucketed series.
  const { overviews, isLoading: isLoadingOverview } = useRollupOverview({
    siteIds,
    lite,
  });
  const statsLoading = isLoading || isLoadingOverview;

  const siteMetaById = useMemo(() => {
    const m = new Map<
      number,
      { siteId: number; name: string; domain: string }
    >();
    for (const s of sites) {
      m.set(s.siteId, { siteId: s.siteId, name: s.name, domain: s.domain });
    }
    return m;
  }, [sites]);

  // Aggregate totals across sites from each site's range total, NOT by summing the
  // chart's buckets: a distinct-user count isn't additive over time, so summing
  // buckets counts anyone active on two days twice and makes the headline number
  // depend on the bucket size. Rates stay session-weighted across sites.
  const totals = useMemo(() => {
    let pageviews = 0;
    let sessions = 0;
    let users = 0;
    let weightedBounce = 0;
    let weightedDuration = 0;
    let weightedPagesPerSession = 0;
    for (const o of overviews) {
      const d = o.data;
      pageviews += d.pageviews;
      sessions += d.sessions;
      users += d.users;
      weightedBounce += d.bounce_rate * d.sessions;
      weightedDuration += d.session_duration * d.sessions;
      weightedPagesPerSession += d.pages_per_session * d.sessions;
    }
    return {
      pageviews,
      sessions,
      users,
      bounce_rate: sessions ? weightedBounce / sessions : 0,
      session_duration: sessions ? weightedDuration / sessions : 0,
      pages_per_session: sessions ? weightedPagesPerSession / sessions : 0,
    };
  }, [overviews]);

  const getSelectedStatLabel = () => {
    switch (selectedStat) {
      case "pageviews":
        return t("Pageviews");
      case "sessions":
        return t("Sessions");
      case "pages_per_session":
        return t("Pages per Session");
      case "bounce_rate":
        return t("Bounce Rate");
      case "session_duration":
        return t("Session Duration");
      case "users":
        return t("Users");
      default:
        return selectedStat;
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-0 w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 items-center">
            <Stat
              title={t("Unique Users")}
              id="users"
              value={totals.users}
              isLoading={statsLoading}
            />
            <Stat
              title={t("Sessions")}
              id="sessions"
              value={totals.sessions}
              isLoading={statsLoading}
            />
            <Stat
              title={t("Pageviews")}
              id="pageviews"
              value={totals.pageviews}
              isLoading={statsLoading}
            />
            <Stat
              title={t("Pages per Session")}
              id="pages_per_session"
              value={totals.pages_per_session}
              decimals={1}
              isLoading={statsLoading}
            />
            <Stat
              title={t("Bounce Rate")}
              id="bounce_rate"
              value={totals.bounce_rate}
              postfix="%"
              decimals={1}
              isLoading={statsLoading}
            />
            <Stat
              title={t("Session Duration")}
              id="session_duration"
              value={totals.session_duration}
              valueFormatter={formatSecondsAsMinutesAndSeconds}
              isLoading={statsLoading}
            />
          </div>
        </CardContent>
        {isFetching && <CardLoader />}
      </Card>

      <Card>
        {isFetching && <CardLoader />}
        <CardContent className="p-2 md:p-4 py-3 w-full">
          <div className="flex items-center justify-between px-2 md:px-0">
            <span className="text-sm text-neutral-700 dark:text-neutral-200">
              {getSelectedStatLabel()}
            </span>
            <BucketSelection />
          </div>
          <div className="h-[200px] md:h-[290px] relative">
            <Chart
              series={series}
              siteMetaById={siteMetaById}
              siteColorMap={siteColorMap}
              selectedStat={selectedStat}
              bucket={bucket}
              time={time}
            />
          </div>
          {series.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 md:px-0 pt-2">
              {series.map((s) => {
                const meta = siteMetaById.get(s.siteId);
                return (
                  <div
                    key={s.siteId}
                    className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300"
                  >
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{
                        backgroundColor: siteColorMap.get(s.siteId) ?? "",
                      }}
                    />
                    <span className="truncate max-w-[180px]">
                      {meta?.name || meta?.domain || `Site ${s.siteId}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
