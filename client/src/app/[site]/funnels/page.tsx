"use client";

import { Funnel } from "lucide-react";
import { useExtracted } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useGetFunnelGoals } from "@/api/analytics/hooks/funnels/useGetFunnelGoals";
import { useGetFunnels } from "@/api/analytics/hooks/funnels/useGetFunnels";
import { useGetFunnelSummaries } from "@/api/analytics/hooks/funnels/useGetFunnelSummaries";
import { describeComparisonWindow } from "@/components/DateSelector/rangeFields";
import { DisabledOverlay } from "@/components/DisabledOverlay";
import { ErrorState } from "@/components/ErrorState";
import { ExternalLink } from "@/components/ExternalLink";
import { NothingFound } from "@/components/NothingFound";
import { AnalysisBar } from "@/components/site/AnalysisBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanOnSite } from "@/hooks/usePermissions";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { FUNNEL_PAGE_FILTERS } from "@/lib/filterGroups";
import { useSiteFilters } from "@/hooks/useSiteFilters";
import { useComparisonEnabled, useStore, useTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { CreateFunnelDialog } from "./components/CreateFunnel";
import { FunnelRowData, FunnelSort, metricsFromSummary, searchFunnels, sortFunnels } from "./components/funnelMetrics";
import { FUNNEL_ROW_GRID, FunnelRow } from "./components/FunnelRow";
import { FunnelSortControl } from "./components/FunnelSortControl";
import { FunnelStatBand } from "./components/FunnelStatBand";

const FunnelRowSkeleton = () => (
  <Card className="@container">
    <div className={cn(FUNNEL_ROW_GRID, "px-4 py-2.5")}>
      <Skeleton className="h-4 w-4 rounded" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-5 w-64 max-w-full rounded" />
      </div>
      <Skeleton className="hidden h-6 w-12 rounded @3xl:block" />
      <Skeleton className="ml-auto hidden h-4 w-12 rounded @3xl:block" />
      <Skeleton className="ml-auto hidden h-4 w-10 rounded @3xl:block" />
      <Skeleton className="ml-auto hidden h-4 w-10 rounded @3xl:block" />
      <Skeleton className="ml-auto hidden h-4 w-12 rounded @3xl:block" />
      <div />
    </div>
  </Card>
);

export default function FunnelsPage() {
  const t = useExtracted();
  useSetPageTitle("Funnels");

  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);
  const time = useStore(state => state.time);
  const previousTime = useStore(state => state.previousTime);
  const zone = useTimezone();
  const comparisonEnabled = useComparisonEnabled();
  const canWrite = useCanOnSite("funnels:write");
  const search = useSearchParams().toString();

  const { data: funnels, isLoading, error } = useGetFunnels(site);
  const current = useGetFunnelSummaries();
  const previous = useGetFunnelSummaries({ periodTime: "previous" });

  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<FunnelSort>("entered");
  // Null until someone opens or closes a row: until then the first funnel is open.
  const [openIds, setOpenIds] = useState<number[] | null>(null);

  const isLoadingSummary = current.isLoading;
  const isLoadingComparison = comparisonEnabled && previous.isLoading;
  // A comparison that is switched off may still be in the cache.
  const previousData = comparisonEnabled ? previous.data : undefined;

  const rows = useMemo<FunnelRowData[]>(
    () =>
      (funnels ?? []).map(funnel => ({
        funnel,
        current: metricsFromSummary(funnel, current.data),
        previous: metricsFromSummary(funnel, previousData),
      })),
    [funnels, current.data, previousData]
  );

  const activeSort = sort === "change" && !comparisonEnabled ? "entered" : sort;
  const visibleRows = useMemo(
    () => searchFunnels(sortFunnels(rows, activeSort), searchQuery),
    [rows, activeSort, searchQuery]
  );

  // The default row is picked once the order is final: sorting by a figure
  // before the figures arrive would open one funnel and then move it.
  const orderSettled = !isLoadingSummary && !(activeSort === "change" && isLoadingComparison);
  const defaultOpenIds = orderSettled && visibleRows.length > 0 ? [visibleRows[0].funnel.id] : [];
  const effectiveOpenIds = openIds ?? defaultOpenIds;

  const toggleRow = (id: number) =>
    setOpenIds(
      effectiveOpenIds.includes(id) ? effectiveOpenIds.filter(open => open !== id) : [...effectiveOpenIds, id]
    );

  // Reordering or filtering keeps the rows that are open, rather than moving "the first one".
  const changeSort = (next: FunnelSort) => {
    setOpenIds(effectiveOpenIds);
    setSort(next);
  };
  const changeSearch = (next: string) => {
    setOpenIds(effectiveOpenIds);
    setSearchQuery(next);
  };

  // Goals are only read to link an open funnel's last step.
  const { data: goals } = useGetFunnelGoals({ enabled: effectiveOpenIds.length > 0 });

  const base = privateKey ? `/${site}/${privateKey}` : `/${site}`;
  const query = search ? `?${search}` : "";
  const links = { goals: `${base}/goals${query}`, journeys: `${base}/journeys${query}` };

  const comparisonLabel = comparisonEnabled ? describeComparisonWindow(previousTime, time, zone) : null;

  const hasFunnels = !!funnels?.length;

  return (
    <DisabledOverlay message="Funnels" featurePath="funnels">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={useSiteFilters(FUNNEL_PAGE_FILTERS)} />

        {(isLoading || hasFunnels) && (
          <>
            <FunnelStatBand
              rows={rows}
              sessionsEntered={current.data?.sessions_entered_any}
              previousSessionsEntered={previousData?.sessions_entered_any}
              comparisonEnabled={comparisonEnabled}
              isLoading={isLoading || isLoadingSummary || isLoadingComparison}
            />
            <AnalysisBar
              end={
                <>
                  <Input
                    placeholder={t("Filter funnels")}
                    className="h-8 w-48"
                    isSearch
                    value={searchQuery}
                    onChange={e => changeSearch(e.target.value)}
                  />
                  {canWrite && <CreateFunnelDialog />}
                </>
              }
            >
              <FunnelSortControl value={activeSort} onChange={changeSort} comparisonEnabled={comparisonEnabled} />
            </AnalysisBar>
            {current.isError && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t("The funnels' figures could not be loaded. Open a funnel to analyze it on its own.")}
              </p>
            )}
          </>
        )}

        {isLoading || !funnels ? (
          error ? (
            <ErrorState
              title={t("Failed to load funnels")}
              message={t("There was a problem fetching the funnels. Please try again later.")}
            />
          ) : (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <FunnelRowSkeleton key={i} />
              ))}
            </div>
          )
        ) : visibleRows.length ? (
          <div className="@container">
            {/* 17px: the cards' 16px padding plus their border. */}
            <div
              className={cn(
                FUNNEL_ROW_GRID,
                "hidden px-[17px] pb-1.5 text-xs text-neutral-500 dark:text-neutral-400 @3xl:grid"
              )}
            >
              <div />
              <div>{t("Funnel")}</div>
              <div>{t("By step")}</div>
              <div className="text-right">{t("Entered")}</div>
              <div className="text-right">{t("Converted")}</div>
              <div className="text-right">{t("Conversion")}</div>
              <div className="whitespace-nowrap text-right">{comparisonEnabled && t("Change")}</div>
              <div />
            </div>
            <div className="space-y-2">
              {visibleRows.map(row => (
                <FunnelRow
                  key={row.funnel.id}
                  row={row}
                  expanded={effectiveOpenIds.includes(row.funnel.id)}
                  onToggle={() => toggleRow(row.funnel.id)}
                  canWrite={canWrite}
                  isLoading={isLoadingSummary}
                  isLoadingComparison={isLoadingComparison}
                  comparisonLabel={comparisonLabel}
                  goals={goals?.data}
                  links={links}
                />
              ))}
            </div>
            {current.data?.truncated && (
              <p className="pt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {t("Figures are shown for the {count} oldest funnels. Open any other funnel to analyze it.", {
                  count: String(current.data.funnels.length),
                })}
              </p>
            )}
          </div>
        ) : hasFunnels ? (
          <NothingFound
            icon={<Funnel className="w-10 h-10" />}
            title={t("No funnels found")}
            description={t('No funnels match "{searchQuery}"', { searchQuery })}
          />
        ) : (
          <NothingFound
            icon={<Funnel className="w-10 h-10" />}
            title={t("No funnels yet")}
            description={
              <span>
                {t("Create your first funnel to track conversions through your site's user journey.")}{" "}
                <ExternalLink href="https://rybbit.com/docs/funnels">{t("Learn more")}</ExternalLink>
              </span>
            }
            action={canWrite ? <CreateFunnelDialog /> : undefined}
          />
        )}
      </div>
    </DisabledOverlay>
  );
}
