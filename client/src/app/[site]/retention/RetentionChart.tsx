"use client";

import { useExtracted } from "next-intl";
import { ReactNode, useId } from "react";
import { ChartLegend, ChartLegendItem } from "../../../components/site/ChartLegend";
import { cn } from "../../../lib/utils";
import { formatPercent, RetentionAverage, RetentionCohortRow, RetentionModel } from "./retentionModel";

export const AVERAGE_COLOR = "hsl(var(--dataviz))";
/** The one cohort drawn on its own line. Orange differs from the data hue in lightness as well as hue. */
export const COHORT_COLOR = "hsl(var(--orange-400))";
const PREVIOUS_COLOR = "hsl(var(--neutral-500))";
const OTHERS_COLOR = "hsl(var(--dataviz) / 0.5)";

// The plot is drawn in a 1000-unit-wide box stretched over the grid's period
// columns, so a period's x is the centre of its column at any width. Strokes
// keep their pixel width (non-scaling-stroke); dots are HTML, which a
// stretched SVG would squash.
const BOX_WIDTH = 1000;
const HEIGHT = 204;
const PLOT_TOP = 12;
const PLOT_BOTTOM = HEIGHT - 6;

type Point = [number, number];

const linePath = (points: Point[]) =>
  points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join("");

/** Finished cells only: a period still in progress would read as a drop. */
const finishedCells = (cohort: RetentionCohortRow) => cohort.cells.filter(cell => cell.offset >= 1 && !cell.partial);

interface RetentionReadoutProps {
  model: RetentionModel;
  /** The comparison period's average per offset. Null while the comparison is off or loading. */
  previousAverage: (RetentionAverage | null)[] | null;
  /** The cohort drawn on its own line. */
  activeCohort: RetentionCohortRow | null;
  activeCohortLabel: string | null;
  /** The period under the crosshair. */
  activeOffset: number;
  periodLabel: (offset: number) => string;
}

/**
 * The curve's legend and its reading at the period under the crosshair, in
 * one: each series is named beside its value.
 */
export function RetentionReadout({
  model,
  previousAverage,
  activeCohort,
  activeCohortLabel,
  activeOffset,
  periodLabel,
}: RetentionReadoutProps) {
  const t = useExtracted();

  const average = model.average[activeOffset] ?? null;
  const previous = previousAverage?.[activeOffset] ?? null;
  const activeCell = activeCohort?.cells[activeOffset];
  const cohort = activeCell && !activeCell.partial ? activeCell : null;
  const others = model.cohorts.flatMap(other => {
    const cell = other.cells[activeOffset];
    return other.size > 0 && other.key !== activeCohort?.key && cell && !cell.partial ? [cell.pct] : [];
  });

  const row = (label: string, text: string) => (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <span className="truncate">{label}</span>
      <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50">{text}</span>
    </span>
  );
  const none = t("n/a");

  const legend: ChartLegendItem[] = [
    {
      id: "average",
      color: AVERAGE_COLOR,
      label: row(t("Average, all cohorts"), average ? formatPercent(average.pct) : none),
    },
  ];
  if (activeCohort && activeCohortLabel) {
    legend.push({
      id: "cohort",
      color: COHORT_COLOR,
      label: row(t("{cohort} cohort", { cohort: activeCohortLabel }), cohort ? formatPercent(cohort.pct) : none),
    });
  }
  if (previousAverage) {
    legend.push({
      id: "previous",
      color: PREVIOUS_COLOR,
      dashed: true,
      label: row(t("Comparison period"), previous ? formatPercent(previous.pct) : none),
    });
  }
  if (others.length > 0) {
    legend.push({
      id: "others",
      color: OTHERS_COLOR,
      label: row(
        t("Other cohorts"),
        others.length === 1
          ? formatPercent(others[0])
          : `${Math.min(...others).toFixed(1)} – ${formatPercent(Math.max(...others))}`
      ),
    });
  }

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between gap-3 text-neutral-500 dark:text-neutral-400">
        <span className="font-medium text-neutral-900 dark:text-neutral-50">{periodLabel(activeOffset)}</span>
        <span>{t("after first visit")}</span>
      </div>
      <ChartLegend items={legend} className="mt-2.5 flex-col flex-nowrap items-stretch gap-y-2" />
      <div className="mt-3 border-t border-neutral-100 pt-2.5 leading-relaxed text-neutral-500 dark:border-neutral-850 dark:text-neutral-400">
        {model.mode === "week"
          ? t("Week 0 is always 100%, so the curve starts at week 1.")
          : t("Day 0 is always 100%, so the curve starts at day 1.")}
      </div>
    </div>
  );
}

interface RetentionChartProps {
  model: RetentionModel;
  /** The comparison period's average per offset. Null while the comparison is off or loading. */
  previousAverage: (RetentionAverage | null)[] | null;
  /** The cohort drawn on its own line. */
  activeCohort: RetentionCohortRow | null;
  activeCohortLabel: string | null;
  /** The period under the crosshair. */
  activeOffset: number;
  onHoverOffset: (offset: number | null) => void;
  /** Drawn in the grid's two leading columns, from md up. */
  readout: ReactNode;
  /** Classes that lay out the grid's columns, shared with the heat grid below. */
  columnsClassName: string;
}

/**
 * The retention curve, drawn over the heat grid's own columns: the average of
 * all cohorts, one highlighted cohort, the comparison period, and the other
 * cohorts as a faint spread. It starts at period 1, since period 0 is always
 * 100% and would flatten everything after it.
 */
export function RetentionChart({
  model,
  previousAverage,
  activeCohort,
  activeCohortLabel,
  activeOffset,
  onHoverOffset,
  readout,
  columnsClassName,
}: RetentionChartProps) {
  const t = useExtracted();
  const gradientId = useId();

  const columns = model.maxOffset;
  const x = (offset: number) => ((offset - 0.5) / columns) * BOX_WIDTH;
  const y = (pct: number) => PLOT_BOTTOM - (Math.min(pct, model.scaleMax) / model.scaleMax) * (PLOT_BOTTOM - PLOT_TOP);
  const left = (offset: number) => `${((offset - 0.5) / columns) * 100}%`;

  const ticks = Array.from({ length: Math.round(model.scaleMax / model.scaleStep) + 1 }, (_, i) => i * model.scaleStep);

  const averagePoints = model.average.flatMap((average, offset): Point[] =>
    average && offset >= 1 ? [[x(offset), y(average.pct)]] : []
  );
  const previousPoints = (previousAverage ?? []).flatMap((average, offset): Point[] =>
    average && offset >= 1 && offset <= columns ? [[x(offset), y(average.pct)]] : []
  );
  const activePoints = activeCohort
    ? finishedCells(activeCohort).map((cell): Point => [x(cell.offset), y(cell.pct)])
    : [];
  const others = model.cohorts.filter(cohort => cohort.size > 0 && cohort.key !== activeCohort?.key);

  const averageAtActive = model.average[activeOffset] ?? null;
  const previousAtActive = previousAverage?.[activeOffset] ?? null;
  const activeCell = activeCohort?.cells[activeOffset];
  const cohortAtActive = activeCell && !activeCell.partial ? activeCell : null;

  const dot = (key: string, offset: number, pct: number, color: string, hollow: boolean) => (
    <span
      key={key}
      className={cn(
        "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
        hollow ? "h-2 w-2 border-2 bg-white dark:bg-neutral-900" : "h-[5px] w-[5px]"
      )}
      style={{
        left: left(offset),
        top: y(pct),
        ...(hollow ? { borderColor: color, boxSizing: "content-box" } : { backgroundColor: color }),
      }}
    />
  );

  return (
    <div className={cn("grid gap-x-0.5", columnsClassName)}>
      {/* Below md the leading columns are too narrow for the readout; the card puts it above the plot. */}
      <div className="col-span-2 hidden pr-14 pt-2 md:block">{readout}</div>
      <div
        className="relative col-start-3 col-end-[-1]"
        style={{ height: HEIGHT }}
        role="img"
        aria-label={
          activeCohortLabel
            ? t("Average retention by period since first visit, with the {cohort} cohort highlighted", {
                cohort: activeCohortLabel,
              })
            : t("Average retention by period since first visit")
        }
      >
        {ticks.map(tick => (
          <span
            key={tick}
            className="absolute right-full mr-2 -translate-y-1/2 whitespace-nowrap text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400"
            style={{ top: y(tick) }}
          >
            {Number.isInteger(tick) ? tick : tick.toFixed(2).replace(/0$/, "")}%
          </span>
        ))}
        <svg
          viewBox={`0 0 ${BOX_WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={AVERAGE_COLOR} stopOpacity="0.2" />
              <stop offset="1" stopColor={AVERAGE_COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map(tick => (
            <line
              key={tick}
              x1={0}
              x2={BOX_WIDTH}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-neutral-200 dark:stroke-neutral-800"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : "2 4"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {others.map(cohort => {
            const points = finishedCells(cohort).map((cell): Point => [x(cell.offset), y(cell.pct)]);
            return points.length > 1 ? (
              <path
                key={cohort.key}
                d={linePath(points)}
                fill="none"
                stroke="hsl(var(--dataviz) / 0.3)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null;
          })}
          {averagePoints.length > 1 && (
            <path
              d={`${linePath(averagePoints)}L${averagePoints[averagePoints.length - 1][0].toFixed(2)},${PLOT_BOTTOM}L${averagePoints[0][0].toFixed(2)},${PLOT_BOTTOM}Z`}
              fill={`url(#${gradientId})`}
            />
          )}
          {previousPoints.length > 1 && (
            <path
              d={linePath(previousPoints)}
              fill="none"
              stroke={PREVIOUS_COLOR}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <line
            x1={x(activeOffset)}
            x2={x(activeOffset)}
            y1={0}
            y2={HEIGHT}
            className="stroke-neutral-300 dark:stroke-neutral-600"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {activePoints.length > 1 && (
            <path
              d={linePath(activePoints)}
              fill="none"
              stroke={COHORT_COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {averagePoints.length > 1 && (
            <path
              d={linePath(averagePoints)}
              fill="none"
              stroke={AVERAGE_COLOR}
              strokeWidth={2.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {model.average.map((average, offset) =>
          average && offset >= 1 ? dot(`average-${offset}`, offset, average.pct, AVERAGE_COLOR, false) : null
        )}
        {/* A cohort with a single finished period has no line to draw. */}
        {activeCohort && activePoints.length === 1
          ? finishedCells(activeCohort).map(cell =>
              dot(`cohort-${cell.offset}`, cell.offset, cell.pct, COHORT_COLOR, false)
            )
          : null}
        {previousAtActive && dot("previous", activeOffset, previousAtActive.pct, PREVIOUS_COLOR, true)}
        {cohortAtActive && dot("cohort", activeOffset, cohortAtActive.pct, COHORT_COLOR, true)}
        {averageAtActive && dot("average", activeOffset, averageAtActive.pct, AVERAGE_COLOR, true)}
        {/* One hover target per period column, so the crosshair follows the pointer onto the grid below. */}
        <div
          className="absolute inset-0 grid gap-x-0.5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          onMouseLeave={() => onHoverOffset(null)}
        >
          {Array.from({ length: columns }, (_, index) => (
            <div key={index} onMouseEnter={() => onHoverOffset(index + 1)} />
          ))}
        </div>
      </div>
    </div>
  );
}
