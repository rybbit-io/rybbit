"use client";

import { useExtracted } from "next-intl";
import { CSSProperties, useCallback, useState } from "react";
import { ProcessedRetentionData } from "../../../api/analytics/endpoints";
import { SegmentedControl } from "../../../components/interior/segmented-control";
import { Card } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";
import { RetentionChart, RetentionReadout } from "./RetentionChart";
import {
  CellTarget,
  HATCH_VARIABLE,
  HatchSwatch,
  HeatLegend,
  HoverTarget,
  RetentionGrid,
  RetentionUnit,
} from "./RetentionGrid";
import { lastPeriodProgress, RetentionAverage, RetentionModel } from "./retentionModel";

// Shared by the curve and the grid so a period's point sits over its column:
// cohort label, cohort size, then one track per period since the first visit.
const COLUMNS =
  "grid-cols-[128px_72px_repeat(var(--rt-periods),minmax(52px,1fr))] md:grid-cols-[168px_120px_repeat(var(--rt-periods),minmax(52px,1fr))]";

interface RetentionCardProps {
  data: ProcessedRetentionData;
  model: RetentionModel;
  /** The comparison period's average per offset; null while the comparison is off or loading. */
  previousAverage: (RetentionAverage | null)[] | null;
  /** A cohort picked outside the card (the insight row's action). */
  pinnedCohort: string | null;
  onPinCohort: (cohort: string) => void;
  hasFilters: boolean;
  cohortLabel: (key: string) => string;
  periodLabel: (offset: number) => string;
  formatDay: (key: string) => string;
}

/**
 * The page's one instrument: the retention curve fused above the cohort heat
 * grid. Hovering either moves one crosshair through both; a cell click pins
 * its figures in a popover.
 */
export function RetentionCard({
  data,
  model,
  previousAverage,
  pinnedCohort,
  onPinCohort,
  hasFilters,
  cohortLabel,
  periodLabel,
  formatDay,
}: RetentionCardProps) {
  const t = useExtracted();
  const [unit, setUnit] = useState<RetentionUnit>("percent");
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const [selected, setSelected] = useState<CellTarget | null>(null);

  const isWeekly = model.mode === "week";
  const cohortByKey = (key: string | null | undefined) =>
    key ? model.cohorts.find(cohort => cohort.key === key && cohort.size > 0) : undefined;
  const inRange = (offset: number | null | undefined): offset is number =>
    typeof offset === "number" && offset >= 1 && offset <= model.maxOffset;

  // A selection made on an earlier range may no longer be in the grid.
  const selectedCohort = cohortByKey(selected?.cohort);
  const selectedOffset = selectedCohort && inRange(selected?.offset) ? selected.offset : null;
  const hoverOffset = inRange(hover?.offset) ? hover.offset : null;

  const activeCohort =
    cohortByKey(hover?.cohort) ??
    selectedCohort ??
    cohortByKey(pinnedCohort) ??
    model.best ??
    model.cohorts.find(cohort => cohort.size > 0) ??
    null;
  const activeOffset = hoverOffset ?? selectedOffset ?? 1;

  const hoverOffsetOnly = useCallback(
    (offset: number | null) => setHover(offset === null ? null : { cohort: null, offset }),
    []
  );
  const pinCohort = useCallback(
    (cohort: string) => {
      setSelected(null);
      onPinCohort(cohort);
    },
    [onPinCohort]
  );

  const progress = lastPeriodProgress(data);
  const lastPeriod = data.periods[data.periods.length - 1];

  const progressNote = !progress
    ? null
    : data.lastPeriodInProgress
      ? isWeekly
        ? t("In progress: the week of {date} has {elapsed} of {total} days", {
            date: formatDay(lastPeriod),
            elapsed: String(progress.elapsedDays),
            total: String(progress.totalDays),
          })
        : t("In progress: {date} is not over yet", { date: formatDay(lastPeriod) })
      : isWeekly
        ? t("Partial: the range ends partway through the week of {date}", { date: formatDay(lastPeriod) })
        : t("Partial: the range ends partway through {date}", { date: formatDay(lastPeriod) });

  const readout = (
    <RetentionReadout
      model={model}
      previousAverage={previousAverage}
      activeCohort={activeCohort}
      activeCohortLabel={activeCohort ? cohortLabel(activeCohort.key) : null}
      activeOffset={activeOffset}
      periodLabel={periodLabel}
    />
  );

  return (
    <Card className={cn("overflow-visible", HATCH_VARIABLE)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 p-4 pb-3">
        <div className="min-w-0">
          <h2 className="font-semibold leading-none tracking-tight">
            {isWeekly ? t("Retention by weekly cohort") : t("Retention by daily cohort")}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {isWeekly
              ? t("Share of each week's new users who were active again, by weeks since their first visit")
              : t("Share of each day's new users who were active again, by days since their first visit")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <HeatLegend scaleMax={model.scaleMax} />
          <SegmentedControl<RetentionUnit>
            aria-label={t("Show cells as")}
            size="sm"
            options={[
              { value: "percent", label: "%", ariaLabel: t("Percent") },
              { value: "users", label: t("Users") },
            ]}
            value={unit}
            onValueChange={setUnit}
          />
        </div>
      </div>

      {/* Outside the scroller, so it stays put while the grid scrolls sideways on a narrow screen. */}
      <div className="px-4 pb-3 md:hidden">{readout}</div>

      <div className="overflow-x-auto px-4 pb-3" style={{ "--rt-periods": model.maxOffset } as CSSProperties}>
        <RetentionChart
          model={model}
          previousAverage={previousAverage}
          activeCohort={activeCohort}
          activeCohortLabel={activeCohort ? cohortLabel(activeCohort.key) : null}
          activeOffset={activeOffset}
          onHoverOffset={hoverOffsetOnly}
          readout={readout}
          columnsClassName={COLUMNS}
        />
        <RetentionGrid
          model={model}
          unit={unit}
          activeCohortKey={activeCohort?.key ?? null}
          bandOffset={hoverOffset ?? selectedOffset}
          selected={selectedCohort && selectedOffset !== null ? selected : null}
          onHover={setHover}
          onSelect={setSelected}
          onPinCohort={pinCohort}
          cohortLabel={cohortLabel}
          periodLabel={periodLabel}
          formatDay={formatDay}
          progress={progress}
          inProgress={data.lastPeriodInProgress}
          columnsClassName={COLUMNS}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500 dark:border-neutral-850 dark:text-neutral-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {progressNote && (
            <span className="inline-flex items-center gap-1.5">
              <HatchSwatch />
              {progressNote}
            </span>
          )}
          {isWeekly && <span>{t("Cohort weeks start on Monday")}</span>}
          <span>
            {t("New users had no visit in the {days} days before the range", { days: String(data.lookbackDays) })}
          </span>
          {hasFilters && <span>{t("Filters apply to each user's first visit")}</span>}
          {data.truncated && (
            <span>
              {isWeekly
                ? t("Showing the latest {count} weeks of the range", { count: String(data.periods.length) })
                : t("Showing the latest {count} days of the range", { count: String(data.periods.length) })}
            </span>
          )}
        </div>
        <span>{t("Click a cell for details")}</span>
      </div>
    </Card>
  );
}
