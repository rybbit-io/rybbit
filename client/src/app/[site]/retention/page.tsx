"use client";

import {
  ArrowRight,
  CalendarClock,
  CalendarRange,
  ChartColumnDecreasing,
  Download,
  Repeat,
  Trophy,
  Users,
} from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { RetentionMode } from "../../../api/analytics/endpoints";
import { useGetRetention } from "../../../api/analytics/hooks/useGetRetention";
import { usePresetLabels } from "../../../components/DateSelector/presets";
import { describeComparisonWindow } from "../../../components/DateSelector/rangeFields";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { ErrorState } from "../../../components/ErrorState";
import { SegmentedControl } from "../../../components/interior/segmented-control";
import { NothingFound } from "../../../components/NothingFound";
import { AnalysisBar } from "../../../components/site/AnalysisBar";
import { InsightRow } from "../../../components/site/InsightRow";
import { StatBand, StatBandCell } from "../../../components/site/StatBand";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { useDateTimeFormat } from "../../../hooks/useDateTimeFormat";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { getDashboardTimeForRange } from "../../../lib/defaultTimeRange";
import { percentDelta, pointDelta } from "../../../lib/delta";
import { downloadCSV } from "../../../lib/export";
import { SESSION_PAGE_FILTERS } from "../../../lib/filterGroups";
import { useStore, useTimezone } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { RetentionCard } from "./RetentionCard";
import {
  buildRetentionModel,
  defaultRetentionMode,
  findCohortOutlier,
  formatPercent,
  periodDays,
  retentionCsv,
  statOffsets,
} from "./retentionModel";

const NO_VALUE = "—";
const LONGER_RANGES = ["last-30-days", "last-60-days"] as const;

function RetentionCardSkeleton() {
  return (
    <Card aria-busy="true">
      <div className="space-y-2 p-4 pb-3">
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="h-4 w-80 max-w-full rounded" />
      </div>
      <div className="space-y-1.5 px-4 pb-4">
        <Skeleton className="h-[204px] w-full rounded" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full rounded" />
        ))}
      </div>
    </Card>
  );
}

export default function RetentionPage() {
  const t = useExtracted();
  useSetPageTitle("Retention");

  const time = useStore(state => state.time);
  const previousTime = useStore(state => state.previousTime);
  const setTime = useStore(state => state.setTime);
  const hasFilters = useStore(state => state.filters.length > 0);
  const timezone = useTimezone();
  const presetLabels = usePresetLabels();
  const { formatDateTime } = useDateTimeFormat();

  // Daily for a short range and weekly for a long one, until the viewer picks.
  const [chosenMode, setChosenMode] = useState<RetentionMode | null>(null);
  const mode = chosenMode ?? defaultRetentionMode(time, timezone);
  const [pinnedCohort, setPinnedCohort] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetRetention(mode);
  // All time has no earlier period: its "previous" is all time again.
  const { data: previousData } = useGetRetention(mode, { periodTime: "previous", enabled: time.mode !== "all-time" });

  // The response says which mode it holds, so labels never run ahead of the grid.
  const model = useMemo(() => (data ? buildRetentionModel(data) : null), [data]);
  const previousModel = useMemo(
    () => (previousData && previousTime && time.mode !== "all-time" ? buildRetentionModel(previousData) : null),
    [previousData, previousTime, time.mode]
  );
  const dataMode = model?.mode ?? mode;
  const isWeekly = dataMode === "week";
  const lastPeriodYear = data?.periods.length ? DateTime.fromISO(data.periods[data.periods.length - 1]).year : null;

  const cohortLabel = useCallback(
    (key: string) => {
      const { first, last } = periodDays(key, dataMode);
      if (dataMode === "day") return formatDateTime(first, { weekday: "short", month: "short", day: "numeric" });
      // The year is only worth its width on a range that crosses into another one.
      const year = first.year !== lastPeriodYear ? ({ year: "numeric" } as const) : {};
      return `${formatDateTime(first, { month: "short", day: "numeric", ...year })} – ${formatDateTime(last, { month: "short", day: "numeric" })}`;
    },
    [dataMode, formatDateTime, lastPeriodYear]
  );
  const formatDay = useCallback(
    (key: string) => formatDateTime(DateTime.fromISO(key), { month: "short", day: "numeric" }),
    [formatDateTime]
  );
  const periodLabel = useCallback(
    (offset: number) =>
      dataMode === "week" ? t("Week {index}", { index: String(offset) }) : t("Day {index}", { index: String(offset) }),
    [dataMode, t]
  );
  // The same, as it reads inside a sentence.
  const periodName = (offset: number) =>
    dataMode === "week" ? t("week {index}", { index: String(offset) }) : t("day {index}", { index: String(offset) });

  const hasGrid = !!model && model.cohorts.length >= 2 && model.totalNew > 0;
  const outlier = hasGrid ? findCohortOutlier(model) : null;
  const comparisonWindow = previousModel ? describeComparisonWindow(previousTime, time, timezone) : null;

  const periodStat = (offset: number, icon: ReactNode): StatBandCell => {
    const current = model?.average[offset] ?? null;
    const previous = previousModel?.average[offset] ?? null;
    const period = periodLabel(offset);
    return {
      id: `period-${offset}`,
      icon,
      label: t("{period} retention", { period }),
      value: current ? formatPercent(current.pct) : NO_VALUE,
      delta: current && previous ? pointDelta(current.pct, previous.pct) : null,
      sub: !current
        ? t("No cohort has finished {period} yet", { period: periodName(offset) })
        : previous
          ? comparisonWindow
            ? t("{value} in {window}", { value: formatPercent(previous.pct), window: comparisonWindow })
            : t("{value} in the comparison period", { value: formatPercent(previous.pct) })
          : t("{users} of {size} new users", {
              users: current.users.toLocaleString(),
              size: current.size.toLocaleString(),
            }),
      title: current
        ? t("{users} of {size} new users, across the cohorts that have finished {period}", {
            users: current.users.toLocaleString(),
            size: current.size.toLocaleString(),
            period: periodName(offset),
          })
        : undefined,
    };
  };

  const [firstOffset, secondOffset, thirdOffset] = statOffsets(dataMode, model);
  const bestCell = model?.best?.cells[1];
  const stats: StatBandCell[] = [
    periodStat(firstOffset, <Repeat className="h-3 w-3" />),
    periodStat(secondOffset, <CalendarRange className="h-3 w-3" />),
    periodStat(thirdOffset, <CalendarClock className="h-3 w-3" />),
    {
      id: "cohort-size",
      icon: <Users className="h-3 w-3" />,
      label: t("Avg. cohort size"),
      value: model?.averageSize != null ? Math.round(model.averageSize).toLocaleString() : NO_VALUE,
      delta: percentDelta(model?.averageSize, previousModel?.averageSize),
      sub: isWeekly ? t("new users per week") : t("new users per day"),
      title: isWeekly
        ? t("Mean size of the cohorts whose week lies wholly inside the range")
        : t("Mean size of the cohorts whose day lies wholly inside the range"),
    },
    {
      id: "best-cohort",
      icon: <Trophy className="h-3 w-3" />,
      label: t("Best cohort"),
      value: model?.best ? cohortLabel(model.best.key) : NO_VALUE,
      sub:
        model?.best && bestCell
          ? isWeekly
            ? t("{value} came back in week 1", { value: formatPercent(bestCell.pct) })
            : t("{value} came back on day 1", { value: formatPercent(bestCell.pct) })
          : t("No cohort has finished {period} yet", { period: periodName(1) }),
      title: isWeekly
        ? t("Highest week 1 retention among cohorts at least half the average size")
        : t("Highest day 1 retention among cohorts at least half the average size"),
    },
  ];

  const exportCsv = () => {
    if (!model || !data) return;
    const { columns, rows } = retentionCsv(model);
    const first = data.periods[0];
    const last = data.periods[data.periods.length - 1];
    downloadCSV(`retention-${model.mode === "week" ? "weekly" : "daily"}-${first}-to-${last}.csv`, rows, columns);
  };

  const outlierName = (chunks: ReactNode) => (
    <span className="font-medium text-neutral-900 dark:text-neutral-50">{chunks}</span>
  );
  const outlierValues = outlier && {
    cohort: cohortLabel(outlier.cohort.key),
    size: outlier.cohort.size.toLocaleString(),
    value: formatPercent(outlier.pct),
    difference: `${Math.abs(outlier.difference).toFixed(1)} pp`,
    name: outlierName,
  };

  return (
    <DisabledOverlay message="Retention" featurePath="retention">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={SESSION_PAGE_FILTERS} />

        {(isLoading || hasGrid) && !isError && <StatBand cells={stats} isLoading={isLoading} />}

        {/* Always rendered, and live while a query loads: a new choice only changes the query key. */}
        <AnalysisBar
          end={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 font-normal text-neutral-600 dark:text-neutral-300"
              onClick={exportCsv}
              disabled={!hasGrid}
            >
              <Download />
              {t("Export CSV")}
            </Button>
          }
        >
          <span className="mx-1 hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-800" aria-hidden="true" />
          <SegmentedControl<RetentionMode>
            aria-label={t("Cohort period")}
            size="sm"
            options={[
              { value: "day", label: t("Daily") },
              { value: "week", label: t("Weekly") },
            ]}
            value={mode}
            onValueChange={setChosenMode}
          />
        </AnalysisBar>

        {outlier && outlierValues && (
          <InsightRow
            action={
              <Button variant="ghost" size="xs" className="gap-1" onClick={() => setPinnedCohort(outlier.cohort.key)}>
                {t("View cohort")}
                <ArrowRight />
              </Button>
            }
          >
            {isWeekly
              ? outlier.difference < 0
                ? t.rich(
                    "The <name>{cohort}</name> cohort is your largest at {size} new users, but only {value} came back in week 1, {difference} under average.",
                    outlierValues
                  )
                : t.rich(
                    "The <name>{cohort}</name> cohort is your largest at {size} new users, and {value} came back in week 1, {difference} above average.",
                    outlierValues
                  )
              : outlier.difference < 0
                ? t.rich(
                    "The <name>{cohort}</name> cohort is your largest at {size} new users, but only {value} came back on day 1, {difference} under average.",
                    outlierValues
                  )
                : t.rich(
                    "The <name>{cohort}</name> cohort is your largest at {size} new users, and {value} came back on day 1, {difference} above average.",
                    outlierValues
                  )}
          </InsightRow>
        )}

        {isError ? (
          <Card>
            <ErrorState
              title={t("Failed to load retention data")}
              message={t("There was a problem fetching the retention data. Please try again later.")}
              refetch={refetch}
            />
          </Card>
        ) : isLoading || !model || !data ? (
          <RetentionCardSkeleton />
        ) : model.cohorts.length < 2 ? (
          <Card>
            <NothingFound
              icon={<ChartColumnDecreasing className="w-10 h-10" />}
              title={t("This range is too short for retention")}
              description={
                isWeekly
                  ? t(
                      "Retention follows new users into the weeks after their first visit, so it needs a range of at least two weeks."
                    )
                  : t(
                      "Retention follows new users into the days after their first visit, so it needs a range of at least two days."
                    )
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {LONGER_RANGES.map(range => (
                    <Button
                      key={range}
                      variant="outline"
                      size="sm"
                      onClick={() => setTime(getDashboardTimeForRange(range, timezone))}
                    >
                      {presetLabels[range]}
                    </Button>
                  ))}
                </div>
              }
            />
          </Card>
        ) : model.totalNew === 0 ? (
          <Card>
            <NothingFound
              icon={<ChartColumnDecreasing className="w-10 h-10" />}
              title={t("No new users in this range")}
              description={
                hasFilters
                  ? t(
                      "Retention follows people from their first visit, and nobody's first visit in this range matches the filters. Try a longer range or fewer filters."
                    )
                  : t(
                      "Retention follows people from their first visit. Try a longer range, or check that tracking is installed."
                    )
              }
            />
          </Card>
        ) : (
          <RetentionCard
            data={data}
            model={model}
            previousAverage={previousModel?.average ?? null}
            pinnedCohort={pinnedCohort}
            onPinCohort={setPinnedCohort}
            hasFilters={hasFilters}
            cohortLabel={cohortLabel}
            periodLabel={periodLabel}
            formatDay={formatDay}
          />
        )}
      </div>
    </DisabledOverlay>
  );
}
