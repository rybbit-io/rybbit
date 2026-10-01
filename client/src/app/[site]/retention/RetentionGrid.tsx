"use client";

import { Hourglass } from "lucide-react";
import { useExtracted } from "next-intl";
import { memo, RefObject, useCallback, useRef } from "react";
import { Badge } from "../../../components/ui/badge";
import { Popover, PopoverAnchor, PopoverContent } from "../../../components/ui/popover";
import { cn, formatter } from "../../../lib/utils";
import { COHORT_COLOR } from "./RetentionChart";
import {
  formatPercent,
  HEAT_DARK_TEXT_FROM,
  heatColor,
  heatStep,
  PeriodProgress,
  RetentionCell,
  RetentionCohortRow,
  RetentionModel,
} from "./retentionModel";

export type RetentionUnit = "percent" | "users";

export interface CellTarget {
  cohort: string;
  offset: number;
}

/** What the pointer is over: a cell, a whole cohort (its label) or a whole period (its header). */
export interface HoverTarget {
  cohort: string | null;
  offset: number | null;
}

// Diagonal hatch for figures that are not final. The stripe colour is the
// panel's, set per theme on the card (--rt-hatch).
const HATCH = "repeating-linear-gradient(135deg, transparent 0 4px, var(--rt-hatch) 4px 6px)";
export const HATCH_VARIABLE = "[--rt-hatch:hsl(var(--neutral-50)/0.8)] dark:[--rt-hatch:hsl(var(--neutral-900)/0.6)]";

const ROW_HIGHLIGHT = "bg-neutral-100 dark:bg-neutral-850";
// The label column stays put while the grid scrolls sideways. Its ::before
// covers the scroller's left padding, where scrolled cells would otherwise show.
const STICKY =
  "sticky left-0 z-20 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-white dark:before:bg-neutral-900";
const HEADER_ROWS = 3;

/** A count that has to fit a grid cell: exact up to six digits, compact beyond. */
export const formatCount = (value: number) => (value >= 100_000 ? formatter(value) : value.toLocaleString());

const solid = (color: string) => `linear-gradient(${color}, ${color})`;

function heatStyle(pct: number, scaleMax: number, partial: boolean) {
  const step = heatStep(pct, scaleMax);
  return {
    step,
    // Painted as an image so it sits over the cell's own base colour, which
    // keeps the palest steps visible on the light panel.
    style: { backgroundImage: partial ? `${HATCH}, ${solid(heatColor(step))}` : solid(heatColor(step)) },
    textClassName: cn(
      partial ? "text-neutral-700" : "text-neutral-900",
      step >= HEAT_DARK_TEXT_FROM ? "dark:text-neutral-950" : partial ? "dark:text-neutral-200" : "dark:text-neutral-50"
    ),
  };
}

const CELL =
  "flex h-8 items-center justify-center rounded text-xs font-medium tabular-nums bg-neutral-50 dark:bg-transparent";

/** The scale's key: lowest label, the eight steps, highest label. */
export function HeatLegend({ scaleMax }: { scaleMax: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
      <span>0%</span>
      <span className="flex gap-px" aria-hidden="true">
        {Array.from({ length: 8 }, (_, step) => (
          <span
            key={step}
            className="h-2.5 w-4 bg-neutral-50 first:rounded-l-sm last:rounded-r-sm dark:bg-transparent"
            style={{ backgroundImage: solid(heatColor(step)) }}
          />
        ))}
      </span>
      <span>{scaleMax}%</span>
    </div>
  );
}

/** The swatch that explains hatched cells. */
export function HatchSwatch() {
  return (
    <span
      className="inline-block h-3 w-5 shrink-0 rounded-sm bg-neutral-50 dark:bg-transparent"
      style={{ backgroundImage: `${HATCH}, ${solid(heatColor(2))}` }}
      aria-hidden="true"
    />
  );
}

interface CohortRowProps {
  cohort: RetentionCohortRow;
  row: number;
  label: string;
  title: string | undefined;
  maxOffset: number;
  maxSize: number;
  scaleMax: number;
  unit: RetentionUnit;
  isActive: boolean;
  /** The selected cell's offset when it is in this row. */
  selectedOffset: number | null;
  emptyMessage: string | null;
  inProgressIcon: boolean;
  cellLabel: (cohort: RetentionCohortRow, cell: RetentionCell) => string;
  onHover: (target: HoverTarget | null) => void;
  onSelect: (target: CellTarget | null) => void;
  onPinCohort: (cohort: string) => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
}

const CohortRow = memo(function CohortRow({
  cohort,
  row,
  label,
  title,
  maxOffset,
  maxSize,
  scaleMax,
  unit,
  isActive,
  selectedOffset,
  emptyMessage,
  inProgressIcon,
  cellLabel,
  onHover,
  onSelect,
  onPinCohort,
  anchorRef,
}: CohortRowProps) {
  const unfinished = cohort.open || cohort.clipped;
  const stickyBackground = isActive ? ROW_HIGHLIGHT : "bg-white dark:bg-neutral-900";

  return (
    <>
      {isActive && (
        <div className={cn("-z-10 -mr-1 rounded-md", ROW_HIGHLIGHT)} style={{ gridRow: row, gridColumn: "1 / -1" }} />
      )}
      <div
        className={cn(STICKY, "flex h-8 items-center rounded-l-md", stickyBackground)}
        style={{ gridRow: row, gridColumn: 1 }}
      >
        <button
          type="button"
          title={title}
          aria-pressed={isActive}
          onClick={() => onPinCohort(cohort.key)}
          onMouseEnter={() => onHover({ cohort: cohort.key, offset: null })}
          onFocus={() => onHover({ cohort: cohort.key, offset: null })}
          className={cn(
            "flex h-full w-full min-w-0 items-center gap-1.5 rounded px-2 text-left text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 md:text-sm dark:focus-visible:ring-neutral-500",
            isActive ? "font-medium text-neutral-900 dark:text-neutral-50" : "text-neutral-700 dark:text-neutral-200"
          )}
        >
          {isActive && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: COHORT_COLOR }}
              aria-hidden="true"
            />
          )}
          <span className="truncate">{label}</span>
        </button>
      </div>
      <div className="flex h-8 items-center gap-2 px-2" style={{ gridRow: row, gridColumn: 2 }}>
        <span
          className={cn(
            "w-full shrink-0 text-right text-xs tabular-nums md:w-12",
            isActive ? "font-medium text-neutral-900 dark:text-neutral-50" : "text-neutral-700 dark:text-neutral-200"
          )}
        >
          {cohort.size.toLocaleString()}
        </span>
        <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 md:block dark:bg-neutral-800">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${maxSize > 0 ? (cohort.size / maxSize) * 100 : 0}%`,
              backgroundImage: unfinished
                ? `${HATCH}, ${solid("hsl(var(--dataviz) / 0.3)")}`
                : solid("hsl(var(--dataviz) / 0.62)"),
            }}
          />
        </span>
      </div>
      {emptyMessage !== null
        ? maxOffset >= 1 && (
            <div
              className="flex h-8 items-center gap-2 rounded border border-dashed border-neutral-200 px-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
              style={{ gridRow: row, gridColumn: "3 / -1" }}
            >
              {inProgressIcon && <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              <span className="truncate">{emptyMessage}</span>
            </div>
          )
        : cohort.cells.slice(1).map(cell => {
            const heat = heatStyle(cell.pct, scaleMax, cell.partial);
            const isSelected = selectedOffset === cell.offset;
            return (
              <button
                key={cell.offset}
                ref={isSelected ? anchorRef : undefined}
                type="button"
                aria-label={cellLabel(cohort, cell)}
                aria-pressed={isSelected}
                onClick={() => onSelect(isSelected ? null : { cohort: cohort.key, offset: cell.offset })}
                onMouseEnter={() => onHover({ cohort: cohort.key, offset: cell.offset })}
                onFocus={() => onHover({ cohort: cohort.key, offset: cell.offset })}
                className={cn(
                  CELL,
                  heat.textClassName,
                  "w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500",
                  isSelected &&
                    "relative z-10 ring-2 ring-neutral-900 ring-offset-2 ring-offset-white dark:ring-neutral-50 dark:ring-offset-neutral-900"
                )}
                style={{ ...heat.style, gridRow: row, gridColumn: cell.offset + 2 }}
              >
                {unit === "percent" ? formatPercent(cell.pct) : formatCount(cell.users)}
              </button>
            );
          })}
    </>
  );
});

interface RetentionGridProps {
  model: RetentionModel;
  unit: RetentionUnit;
  /** The cohort drawn on its own line in the curve; its row is marked. */
  activeCohortKey: string | null;
  /** The period column to band: set while one is hovered or selected. */
  bandOffset: number | null;
  selected: CellTarget | null;
  onHover: (target: HoverTarget | null) => void;
  onSelect: (target: CellTarget | null) => void;
  onPinCohort: (cohort: string) => void;
  cohortLabel: (key: string) => string;
  periodLabel: (offset: number) => string;
  formatDay: (key: string) => string;
  /** How far the window reaches into its last period; null when that period is whole. */
  progress: PeriodProgress | null;
  /** The last period is partial because it is still going on, not because the range stops there. */
  inProgress: boolean;
  columnsClassName: string;
}

/**
 * The cohort heat grid: one row per cohort period, one column per period since
 * the first visit, starting at period 1. A cell opens a popover with the
 * figures behind it.
 */
export function RetentionGrid({
  model,
  unit,
  activeCohortKey,
  bandOffset,
  selected,
  onHover,
  onSelect,
  onPinCohort,
  cohortLabel,
  periodLabel,
  formatDay,
  progress,
  inProgress,
  columnsClassName,
}: RetentionGridProps) {
  const t = useExtracted();
  const anchorRef = useRef<HTMLButtonElement | null>(null);

  const offsets = Array.from({ length: model.maxOffset }, (_, index) => index + 1);
  const maxSize = Math.max(...model.cohorts.map(cohort => cohort.size), 0);
  const isWeekly = model.mode === "week";

  const selectedCohort = selected ? model.cohorts.find(cohort => cohort.key === selected.cohort) : undefined;
  const selectedCell =
    selectedCohort && selected && selected.offset >= 1 ? selectedCohort.cells[selected.offset] : undefined;
  const selectedAverage = selected ? model.average[selected.offset] : null;
  const returnPeriod =
    selectedCohort && selectedCell ? model.cohorts[selectedCohort.index + selectedCell.offset] : undefined;

  // Stable, like the other props of the memoized rows: a hover should re-render two rows, not all of them.
  const cellLabel = useCallback(
    (cohort: RetentionCohortRow, cell: RetentionCell) =>
      t("{cohort} cohort, {period}: {percent}, {users} of {size} users", {
        cohort: cohortLabel(cohort.key),
        period: periodLabel(cell.offset),
        percent: formatPercent(cell.pct),
        users: formatCount(cell.users),
        size: formatCount(cohort.size),
      }),
    [t, cohortLabel, periodLabel]
  );

  const emptyMessage = (cohort: RetentionCohortRow): string | null => {
    if (cohort.size === 0) return t("No new users");
    if (cohort.cells.length > 1) return null;
    if (cohort.open && inProgress && progress) {
      return isWeekly
        ? t("Week in progress, {elapsed} of {total} days. Returns start filling in on {date}.", {
            elapsed: String(progress.elapsedDays),
            total: String(progress.totalDays),
            date: formatDay(progress.nextPeriod),
          })
        : t("Day in progress. Returns start filling in on {date}.", { date: formatDay(progress.nextPeriod) });
    }
    return t("The range ends here, so there are no returns to show.");
  };

  const rowTitle = (cohort: RetentionCohortRow) =>
    cohort.clipped
      ? isWeekly
        ? t("The range starts partway through this week, so this cohort misses its first days.")
        : t("The range starts partway through this day, so this cohort misses its first hours.")
      : undefined;

  const figure = "tabular-nums text-neutral-900 dark:text-neutral-50";
  const factLabel = "text-neutral-600 dark:text-neutral-300";

  return (
    <Popover open={!!selectedCell} onOpenChange={open => !open && onSelect(null)}>
      {/* Anchored to whichever cell is selected, without wrapping (and remounting) it. */}
      <PopoverAnchor virtualRef={anchorRef as RefObject<HTMLButtonElement>} />
      <div className={cn("relative isolate grid gap-0.5", columnsClassName)} onMouseLeave={() => onHover(null)}>
        {bandOffset !== null && bandOffset >= 1 && bandOffset <= model.maxOffset && (
          <div
            className="-z-10 -mx-[3px] rounded-md bg-neutral-100 dark:bg-neutral-800/70"
            style={{ gridColumn: bandOffset + 2, gridRow: `1 / span ${HEADER_ROWS + model.cohorts.length}` }}
          />
        )}

        <div
          className={cn(
            STICKY,
            "flex h-7 items-center bg-white px-2 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
          )}
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          <span className="truncate">{t("Cohort, by first visit")}</span>
        </div>
        <div
          className="flex h-7 items-center justify-end px-1 text-xs text-neutral-500 md:justify-start md:px-2 dark:text-neutral-400"
          style={{ gridRow: 1, gridColumn: 2 }}
        >
          <span className="truncate">{t("New users")}</span>
        </div>
        {offsets.map(offset => (
          <div
            key={offset}
            onMouseEnter={() => onHover({ cohort: null, offset })}
            className={cn(
              "flex h-7 items-center justify-center whitespace-nowrap text-xs",
              offset === bandOffset
                ? "font-medium text-neutral-900 dark:text-neutral-50"
                : "text-neutral-500 dark:text-neutral-400"
            )}
            style={{ gridRow: 1, gridColumn: offset + 2 }}
          >
            {periodLabel(offset)}
          </div>
        ))}

        <div
          className={cn(STICKY, "flex h-8 items-baseline gap-1.5 bg-white px-2 pt-2 dark:bg-neutral-900")}
          style={{ gridRow: 2, gridColumn: 1 }}
        >
          <span className="truncate text-xs font-medium text-neutral-900 md:text-sm dark:text-neutral-50">
            {t("All cohorts")}
          </span>
          <span className="hidden text-xs text-neutral-500 md:inline dark:text-neutral-400">
            {unit === "percent" ? t("weighted") : t("total")}
          </span>
        </div>
        <div className="flex h-8 items-center gap-2 px-2" style={{ gridRow: 2, gridColumn: 2 }}>
          <span className="w-full shrink-0 text-right text-xs font-medium tabular-nums text-neutral-900 md:w-12 dark:text-neutral-50">
            {model.totalNew.toLocaleString()}
          </span>
          <span className="hidden text-xs text-neutral-500 md:inline dark:text-neutral-400">{t("total")}</span>
        </div>
        {offsets.map(offset => {
          const average = model.average[offset];
          if (!average) {
            return (
              <div
                key={offset}
                onMouseEnter={() => onHover({ cohort: null, offset })}
                className="flex h-8 items-center justify-center text-xs text-neutral-500 dark:text-neutral-400"
                style={{ gridRow: 2, gridColumn: offset + 2 }}
              >
                {t("n/a")}
              </div>
            );
          }
          const heat = heatStyle(average.pct, model.scaleMax, false);
          return (
            <div
              key={offset}
              onMouseEnter={() => onHover({ cohort: null, offset })}
              title={t("{users} of {size} new users, across the cohorts that have finished {period}", {
                users: average.users.toLocaleString(),
                size: average.size.toLocaleString(),
                period: isWeekly
                  ? t("week {index}", { index: String(offset) })
                  : t("day {index}", { index: String(offset) }),
              })}
              className={cn(CELL, heat.textClassName)}
              style={{ ...heat.style, gridRow: 2, gridColumn: offset + 2 }}
            >
              {unit === "percent" ? formatPercent(average.pct) : formatCount(average.users)}
            </div>
          );
        })}

        <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" style={{ gridRow: 3, gridColumn: "1 / -1" }} />

        {model.cohorts.map(cohort => (
          <CohortRow
            key={cohort.key}
            cohort={cohort}
            row={HEADER_ROWS + 1 + cohort.index}
            label={cohortLabel(cohort.key)}
            title={rowTitle(cohort)}
            maxOffset={model.maxOffset}
            maxSize={maxSize}
            scaleMax={model.scaleMax}
            unit={unit}
            isActive={cohort.key === activeCohortKey}
            selectedOffset={selectedCell && selected?.cohort === cohort.key ? selected.offset : null}
            emptyMessage={emptyMessage(cohort)}
            inProgressIcon={cohort.open && inProgress}
            cellLabel={cellLabel}
            onHover={onHover}
            onSelect={onSelect}
            onPinCohort={onPinCohort}
            anchorRef={anchorRef}
          />
        ))}
      </div>

      {selectedCohort && selectedCell && (
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-[296px] p-0"
          aria-label={t("Cohort cell details")}
          // The cell keeps focus and toggles itself; without this a click on it would close and reopen.
          onOpenAutoFocus={event => event.preventDefault()}
          onInteractOutside={event => {
            if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
          }}
        >
          <div className="px-3 pb-2 pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {t("{cohort} cohort", { cohort: cohortLabel(selectedCohort.key) })}
              </span>
              <Badge variant="outline" className="shrink-0">
                {periodLabel(selectedCell.offset)}
              </Badge>
            </div>
            {returnPeriod && (
              <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {t("Active again {period}", { period: cohortLabel(returnPeriod.key) })}
              </div>
            )}
          </div>
          <div className="space-y-1.5 border-t border-neutral-100 px-3 py-2.5 text-xs dark:border-neutral-700">
            <div className="flex items-center justify-between gap-3">
              <span className={factLabel}>{selectedCell.partial ? t("Came back so far") : t("Came back")}</span>
              <span className={cn("tabular-nums", factLabel)}>
                <span className={cn("font-medium", figure)}>{selectedCell.users.toLocaleString()}</span>{" "}
                {t("of {size}", { size: selectedCohort.size.toLocaleString() })}
                {" · "}
                <span className={cn("font-medium", figure)}>{formatPercent(selectedCell.pct)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className={factLabel}>
                {t("Average for {period}", { period: periodLabel(selectedCell.offset) })}
              </span>
              <span className={figure}>{selectedAverage ? formatPercent(selectedAverage.pct) : t("n/a")}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className={factLabel}>{selectedCell.partial ? t("Not back yet") : t("Did not come back")}</span>
              <span className={figure}>{(selectedCohort.size - selectedCell.users).toLocaleString()}</span>
            </div>
          </div>
          {selectedCell.partial && (
            <div className="flex items-center gap-2 border-t border-neutral-100 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              <HatchSwatch />
              {inProgress
                ? t("Still in progress, so this figure will rise.")
                : t("The range ends partway through this period.")}
            </div>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
