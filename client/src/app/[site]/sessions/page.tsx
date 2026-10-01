"use client";

import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { SessionView } from "@/api/analytics/endpoints";
import { useGetSessionsSummary } from "@/api/analytics/hooks/useGetSessionsSummary";
import { useGetSessions } from "@/api/analytics/hooks/useGetUserSessions";
import { DisabledOverlay } from "@/components/DisabledOverlay";
import { AnalysisBar } from "@/components/site/AnalysisBar";
import { useReplayAvailable } from "@/hooks/useReplayAvailable";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { SESSION_PAGE_FILTERS } from "@/lib/filterGroups";
import { useComparisonEnabled, useStore } from "@/lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { RangeChip } from "./components/RangeChip";
import { PAGE_SIZE_OPTIONS, SessionSortState, SessionsLedger } from "./components/SessionsLedger";
import { SessionsStatBand } from "./components/SessionsStatBand";
import { EMPTY_RANGES, hasAnyRange, RangeMetric, RangeValue, SessionRanges, toRangeParams } from "./sessionRanges";

const DEFAULT_SORT: SessionSortState = { by: "started", order: "desc" };

export default function SessionsPage() {
  const t = useExtracted();
  useSetPageTitle("Sessions");

  const [view, setView] = useState<SessionView>("all");
  const [sort, setSort] = useState<SessionSortState>(DEFAULT_SORT);
  const [ranges, setRanges] = useState<SessionRanges>(EMPTY_RANGES);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // The page number only means something for one list. Anything that changes
  // which sessions are listed, or their order, starts again from page 1; the
  // number is stored with the list it belongs to, so no effect has to reset it.
  const time = useStore(state => state.time);
  const filters = useStore(state => state.filters);
  const segmentId = useStore(state => state.segmentId);
  const listKey = JSON.stringify([time, filters, segmentId, view, sort, ranges, pageSize]);
  const [pageState, setPageState] = useState({ listKey, page: 1 });
  const page = pageState.listKey === listKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ listKey, page: next });

  const setRange = (metric: RangeMetric) => (value: RangeValue) =>
    setRanges(current => ({ ...current, [metric]: value }));
  const rangeParams = toRangeParams(ranges);

  const replayAvailable = useReplayAvailable();
  const comparisonEnabled = useComparisonEnabled();

  const {
    data: sessions,
    isLoading,
    isError,
    isPlaceholderData,
  } = useGetSessions({
    page,
    limit: pageSize,
    view: view === "all" ? undefined : view,
    sortBy: sort.by,
    sortOrder: sort.order,
    includeGoals: true,
    ...rangeParams,
  });
  const { data: summary, isLoading: isSummaryLoading } = useGetSessionsSummary(rangeParams);
  // The band describes the whole period, so its comparison takes no ranges.
  const { data: previousSummary } = useGetSessionsSummary({ periodTime: "previous" });

  const dayCounts = useMemo(
    () => new Map((summary?.days ?? []).map(day => [day.day, day[view] ?? 0])),
    [summary?.days, view]
  );

  const narrowed = hasAnyRange(ranges);

  return (
    <DisabledOverlay message={t("Sessions")} featurePath="sessions">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={SESSION_PAGE_FILTERS} />
        <SessionsStatBand
          summary={summary}
          previous={comparisonEnabled ? previousSummary : undefined}
          isLoading={isSummaryLoading}
        />
        <AnalysisBar
          end={
            narrowed && summary ? (
              <span className="whitespace-nowrap text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {t.rich("<b>{matching}</b> of {total} sessions match", {
                  matching: summary.matching.all.toLocaleString(),
                  total: summary.sessions.toLocaleString(),
                  b: chunks => <span className="font-medium text-neutral-900 dark:text-neutral-100">{chunks}</span>,
                })}
              </span>
            ) : null
          }
        >
          <div className="mx-1 hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />
          <RangeChip
            label={t("Pageviews")}
            clearLabel={t("Clear pageviews range")}
            value={ranges.pageviews}
            onChange={setRange("pageviews")}
          />
          <RangeChip
            label={t("Events")}
            clearLabel={t("Clear events range")}
            value={ranges.events}
            onChange={setRange("events")}
          />
          <RangeChip
            label={t("Duration")}
            clearLabel={t("Clear duration range")}
            value={ranges.duration}
            onChange={setRange("duration")}
            duration
          />
        </AnalysisBar>
        <SessionsLedger
          sessions={sessions ?? []}
          isLoading={isLoading}
          isRefreshing={isPlaceholderData}
          isError={isError}
          view={view}
          onViewChange={setView}
          counts={summary?.matching}
          dayCounts={dayCounts}
          showReplay={replayAvailable}
          narrowed={narrowed}
          sort={sort}
          onSortChange={setSort}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </DisabledOverlay>
  );
}
