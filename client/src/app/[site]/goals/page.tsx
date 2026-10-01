"use client";

import { TimeBucket } from "@rybbit/shared";
import { Plus, Target } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { Goal } from "../../../api/analytics/endpoints";
import { useGetGoalsSummary } from "../../../api/analytics/hooks/goals/useGetGoalsSummary";
import { useGetGoalTimeSeries } from "../../../api/analytics/hooks/goals/useGetGoalTimeSeries";
import { BucketSelection } from "../../../components/BucketSelection";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { ErrorState } from "../../../components/ErrorState";
import { ExternalLink } from "../../../components/ExternalLink";
import { NothingFound } from "../../../components/NothingFound";
import { Pagination } from "../../../components/pagination";
import { AnalysisBar } from "../../../components/site/AnalysisBar";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useCanOnSite } from "../../../hooks/usePermissions";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { GOALS_PAGE_FILTERS } from "../../../lib/filterGroups";
import { useComparisonEnabled, useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { GoalEditor } from "./components/GoalEditor";
import { GoalsLedger, GoalsLedgerSkeleton } from "./components/GoalsLedger";
import { GoalsSummaryBand } from "./components/GoalsSummaryBand";
import { TrendPoint } from "./components/GoalTrendBars";
import {
  buildLedgerRows,
  DEFAULT_LEDGER_SORT,
  LedgerSort,
  LedgerSortKey,
  matchesGoalSearch,
  sortLedgerRows,
} from "./utils/goalLedger";

// Rows per page. Each visible row asks for its own series, so this also
// bounds the time-series query.
const PAGE_SIZE = 10;

const CARD =
  "overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900";
const MUTED = "text-neutral-500 dark:text-neutral-400";

/** The inline form at the foot of the ledger: closed, a new goal, or a copy of an existing one. */
type Creator = null | { mode: "create" } | { mode: "clone"; goal: Goal };

export default function GoalsPage() {
  const t = useExtracted();
  useSetPageTitle("Goals");

  const site = useStore(state => state.site);
  const bucket = useStore(state => state.bucket);
  const canWrite = useCanOnSite("goals:write");
  const comparisonEnabled = useComparisonEnabled();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<LedgerSort>(DEFAULT_LEDGER_SORT);
  const [page, setPage] = useState(1);
  const [creator, setCreator] = useState<Creator>(null);

  const { data: summary, isLoading, isError, refetch } = useGetGoalsSummary();
  const previous = useGetGoalsSummary({ periodTime: "previous" });
  // A disabled query can still hold the last comparison it fetched.
  const previousSummary = comparisonEnabled ? previous.data : undefined;
  const isLoadingComparison = comparisonEnabled && previous.isLoading;

  const goalLabel = (goal: Goal) => goal.name || t("Goal #{goalId}", { goalId: String(goal.goalId) });
  const allRows = buildLedgerRows(summary?.goals ?? [], previousSummary?.goals, goalLabel);

  // Search and sort run over every goal; only then is the list cut into pages.
  const changeSorts: LedgerSortKey[] = ["conversionsChange", "rateChange"];
  const activeSort = !comparisonEnabled && changeSorts.includes(sort.key) ? DEFAULT_LEDGER_SORT : sort;
  const matchingRows = sortLedgerRows(
    allRows.filter(row => matchesGoalSearch(row, search)),
    activeSort
  );
  const pageCount = Math.max(1, Math.ceil(matchingRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = matchingRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const maxConversions = allRows.reduce((max, row) => Math.max(max, row.conversions), 0);

  // Sorted so that re-sorting the same page of goals does not ask again.
  const visibleGoalIds = visibleRows.map(row => row.goal.goalId).sort((a, b) => a - b);
  const { data: timeSeries, isLoading: isLoadingTimeSeries } = useGetGoalTimeSeries({ goalIds: visibleGoalIds });
  const timeSeriesByGoal = useMemo(() => {
    const byGoal = new Map<number, TrendPoint[]>();
    for (const point of timeSeries ?? []) {
      const points = byGoal.get(point.goal_id) ?? [];
      points.push(point);
      byGoal.set(point.goal_id, points);
    }
    return byGoal;
  }, [timeSeries]);

  const interval: Partial<Record<TimeBucket, { heading: string; label: string; title: string }>> = {
    hour: { heading: t("Hourly"), label: t("conversions per hour"), title: t("Conversions per hour") },
    day: { heading: t("Daily"), label: t("conversions per day"), title: t("Conversions per day") },
    week: { heading: t("Weekly"), label: t("conversions per week"), title: t("Conversions per week") },
    month: { heading: t("Monthly"), label: t("conversions per month"), title: t("Conversions per month") },
    year: { heading: t("Yearly"), label: t("conversions per year"), title: t("Conversions per year") },
  };
  const { heading, label, title } = interval[bucket] ?? {
    heading: t("Trend"),
    label: t("conversions over time"),
    title: t("Conversions over time"),
  };

  const sortNames: Record<LedgerSortKey, string> = {
    name: t("name"),
    conversions: t("conversions"),
    conversionsChange: t("change in conversions"),
    rate: t("rate"),
    rateChange: t("change in rate"),
  };

  const openCreator = () => setCreator({ mode: "create" });
  const closeCreator = () => setCreator(null);
  const creatorForm = creator && (
    <GoalEditor
      // A clone of another goal is another form: start it from that goal.
      key={creator.mode === "clone" ? `clone-${creator.goal.goalId}` : "create"}
      siteId={Number(site)}
      mode={creator.mode}
      goal={creator.mode === "clone" ? creator.goal : undefined}
      onDone={closeCreator}
    />
  );

  const hasGoals = !!summary && summary.goals.length > 0;

  return (
    <DisabledOverlay message="Goals" featurePath="goals" requiredPlan="basic">
      <div className="p-2 md:p-4 max-w-[1400px] mx-auto space-y-3">
        <SubHeader availableFilters={GOALS_PAGE_FILTERS} />

        {/* if site is not loaded, show skeleton */}
        {isLoading || !site ? (
          <>
            <GoalsSummaryBand rows={[]} isLoading comparisonEnabled={comparisonEnabled} isLoadingComparison={false} />
            <GoalsLedgerSkeleton />
          </>
        ) : isError || !summary ? (
          <div className={CARD}>
            <ErrorState
              title={t("Failed to load goals")}
              message={t("There was a problem fetching the goals. Please try again later.")}
              refetch={refetch}
            />
          </div>
        ) : !hasGoals ? (
          <>
            <NothingFound
              icon={<Target className="w-10 h-10" />}
              title={t("No goals found")}
              description={
                <span>
                  {t("Create your first conversion goal to start tracking important user actions.")}{" "}
                  <ExternalLink href="https://rybbit.com/docs/goals">{t("Learn more")}</ExternalLink>
                </span>
              }
              action={
                canWrite && !creator ? (
                  <Button onClick={openCreator}>
                    <Plus />
                    {t("New goal")}
                  </Button>
                ) : undefined
              }
            />
            {canWrite && creator && <div className={CARD}>{creatorForm}</div>}
          </>
        ) : (
          <>
            <GoalsSummaryBand
              summary={summary}
              previous={previousSummary}
              rows={allRows}
              isLoading={false}
              comparisonEnabled={comparisonEnabled}
              isLoadingComparison={isLoadingComparison}
            />

            <AnalysisBar
              end={
                <>
                  <span className={`hidden text-xs md:inline ${MUTED}`}>
                    {search.trim()
                      ? t("{shown} of {count, plural, one {# goal} other {# goals}}, sorted by {column}", {
                          shown: String(matchingRows.length),
                          count: allRows.length,
                          column: sortNames[activeSort.key],
                        })
                      : t("{count, plural, one {# goal} other {# goals}}, sorted by {column}", {
                          count: allRows.length,
                          column: sortNames[activeSort.key],
                        })}
                  </span>
                  {canWrite && (
                    <Button size="sm" onClick={openCreator}>
                      <Plus />
                      {t("New goal")}
                    </Button>
                  )}
                </>
              }
            >
              <div className="hidden h-5 w-px bg-neutral-200 dark:bg-neutral-800 sm:block" aria-hidden="true" />
              <Input
                placeholder={t("Filter goals")}
                aria-label={t("Filter goals")}
                className="h-8 w-44 text-xs sm:w-52"
                isSearch
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
              <BucketSelection />
            </AnalysisBar>

            <GoalsLedger
              rows={visibleRows}
              sort={activeSort}
              onSortChange={next => {
                setSort(next);
                setPage(1);
              }}
              comparisonEnabled={comparisonEnabled}
              isLoadingComparison={isLoadingComparison}
              maxConversions={maxConversions}
              siteId={Number(site)}
              canWrite={canWrite}
              timeSeriesByGoal={timeSeriesByGoal}
              isLoadingTimeSeries={isLoadingTimeSeries}
              trendHeading={heading}
              trendLabel={label}
              chartTitle={title}
              onClone={goal => setCreator({ mode: "clone", goal })}
              emptyState={
                matchingRows.length === 0 ? (
                  <NothingFound
                    icon={<Target className="w-10 h-10" />}
                    title={t("No goals found")}
                    description={t('No goals match "{searchQuery}"', { searchQuery: search })}
                  />
                ) : undefined
              }
              footer={
                canWrite &&
                (creator ? (
                  <div className="border-t border-neutral-100 dark:border-neutral-800">{creatorForm}</div>
                ) : (
                  <button
                    type="button"
                    onClick={openCreator}
                    className="flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800/20 dark:hover:text-neutral-100"
                  >
                    <Plus className="h-4 w-4" />
                    {t("New goal")}
                  </button>
                ))
              }
            />

            {pageCount > 1 && (
              <Pagination
                page={currentPage}
                pageCount={pageCount}
                totalItems={matchingRows.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                itemName="goals"
              />
            )}

            <p className={`px-1 text-xs ${MUTED}`}>
              {t(
                "A conversion is a session that completed the goal at least once. Rate is conversions divided by the {sessions} sessions in range.",
                { sessions: summary.total_sessions.toLocaleString() }
              )}
              {summary.total_goals > summary.goals.length && (
                <>
                  {" "}
                  {t("Showing the {shown} most recently created of {total} goals.", {
                    shown: String(summary.goals.length),
                    total: String(summary.total_goals),
                  })}
                </>
              )}
            </p>
          </>
        )}
      </div>
    </DisabledOverlay>
  );
}
