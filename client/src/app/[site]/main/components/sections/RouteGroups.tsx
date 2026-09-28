"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { MetricResponse } from "../../../../../api/analytics/endpoints";
import { nextPageByTotalCount, useAnalyticsInfiniteQuery } from "../../../../../api/analytics/useAnalyticsQuery";
import { ErrorState } from "../../../../../components/ErrorState";
import { Button } from "../../../../../components/ui/button";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { Row } from "../../../components/shared/StandardSection/Row";
import { StandardSkeleton } from "../../../components/shared/StandardSection/Skeleton";

export function RouteGroups({ expanded = false }: { expanded?: boolean }) {
  const t = useExtracted();
  const [routeGroup, setRouteGroup] = useState<string>();
  const { data: siteMetadata } = useGetSite();
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAnalyticsInfiniteQuery<{ data: MetricResponse[]; totalCount: number }>({
      key: "route-groups",
      path: "route-groups",
      params: { route_group: routeGroup, limit: 100 },
      initialPageParam: 1,
      pageParams: page => ({ page }),
      getNextPageParam: nextPageByTotalCount,
    });
  const items = [...new Map(data?.pages.flatMap(page => page.data).map(item => [item.value, item])).values()];
  const ratio = items[0]?.percentage ? 100 / items[0].percentage : 1;

  return (
    <div className={expanded ? "flex min-h-0 flex-1 flex-col" : ""}>
      {routeGroup !== undefined ? (
        <div className="mb-2 flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setRouteGroup(undefined)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Route groups")}
          </Button>
          <span className="truncate text-xs text-muted-foreground" title={routeGroup}>
            {routeGroup}
          </span>
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">{t("Select a route group to see individual URLs.")}</p>
      )}
      {error ? (
        <ErrorState
          title={t("Failed to load data")}
          message={t("An error occurred while fetching data")}
          refetch={refetch}
        />
      ) : (
        <ScrollArea className={expanded ? "min-h-0 flex-1" : "h-[290px]"}>
          <div className="flex flex-col gap-2 pr-2" aria-busy={isLoading}>
            {isLoading ? (
              <StandardSkeleton />
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("No data")}</p>
            ) : (
              items.map(item =>
                routeGroup === undefined ? (
                  <button
                    key={item.value}
                    type="button"
                    title={item.value}
                    className="group relative flex h-6 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-xs hover:bg-neutral-150/50 focus-visible:outline-2 focus-visible:outline-primary dark:hover:bg-neutral-850"
                    onClick={() => setRouteGroup(item.value)}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 rounded-md bg-dataviz opacity-25"
                      style={{ width: `${Math.min(100, item.percentage * ratio)}%` }}
                    />
                    <span className="relative min-w-0 flex-1 truncate">{item.value || t("Other")}</span>
                    <span className="relative shrink-0">
                      {item.count.toLocaleString(undefined, { notation: "compact" })}
                    </span>
                    <ChevronRight className="relative h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ) : (
                  <Row
                    key={item.value}
                    e={item}
                    ratio={ratio}
                    filterParameter="pathname"
                    getKey={row => row.value}
                    getValue={row => row.value}
                    getLabel={row => row.value || t("Other")}
                    getLink={row => {
                      const host = row.hostname || siteMetadata?.domain;
                      return host ? `https://${host}${row.value}` : "#";
                    }}
                  />
                )
              )
            )}
            {hasNextPage && (
              <Button variant="ghost" size="sm" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                {isFetchingNextPage ? t("Loading...") : t("Load more")}
              </Button>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
