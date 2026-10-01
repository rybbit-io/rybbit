import { DateTime } from "luxon";
import { ProcessedRetentionData, RetentionMode } from "../../../api/analytics/endpoints";
import { Time } from "../../../components/DateSelector/types";
import { getAbsoluteBounds } from "../../../lib/time";

/**
 * The retention response laid out for the page: one row per cohort period,
 * the size-weighted average per period, and the handful of facts the stat
 * band and the insight row state. Pure, so it is tested without a browser.
 */

export interface RetentionCell {
  /** Periods since the cohort's first visit. 0 is the cohort's own period. */
  offset: number;
  users: number;
  /** Share of the cohort, 0 to 100. */
  pct: number;
  /** The period this cell covers is not over inside the window, so the figure is not final. */
  partial: boolean;
}

export interface RetentionCohortRow {
  /** The cohort period's first day, YYYY-MM-DD. */
  key: string;
  index: number;
  size: number;
  /** Indexed by offset. Later cohorts have fewer: nothing past the window's end is observable. */
  cells: RetentionCell[];
  /** The cohort's own period is not over, so its new users are still arriving. */
  open: boolean;
  /** The window starts after this period began, so the cohort misses the period's first days. */
  clipped: boolean;
}

export interface RetentionAverage {
  users: number;
  size: number;
  pct: number;
}

export interface RetentionModel {
  mode: RetentionMode;
  cohorts: RetentionCohortRow[];
  /** The highest offset a cohort can show: one less than the number of periods. */
  maxOffset: number;
  /** Indexed by offset, weighted by cohort size over finished cells. Null when no cohort has finished that period. */
  average: (RetentionAverage | null)[];
  totalNew: number;
  /** Mean size of the cohorts whose period lies wholly inside the window. */
  averageSize: number | null;
  /** Highest period-1 retention among cohorts of a meaningful size. */
  best: RetentionCohortRow | null;
  /** Ceiling shared by the heat scale and the curve's y axis, in percent. */
  scaleMax: number;
  /** Step between y-axis ticks, in percent. */
  scaleStep: number;
}

// The stat band's three periods, longest first: the classic 1/4/8 weeks and
// 1/7/30 days when the range is long enough to have finished them, shorter
// sets otherwise, so a 30-day range does not open with an empty figure.
const STAT_OFFSETS: Record<RetentionMode, readonly (readonly [number, number, number])[]> = {
  day: [
    [1, 7, 30],
    [1, 7, 14],
    [1, 3, 7],
    [1, 2, 3],
  ],
  week: [
    [1, 4, 8],
    [1, 2, 4],
    [1, 2, 3],
  ],
};

/** The periods the stat band reports on: the longest set whose last period some cohort has finished. */
export function statOffsets(mode: RetentionMode, model: RetentionModel | null): readonly [number, number, number] {
  const sets = STAT_OFFSETS[mode];
  return (model && sets.find(set => model.average[set[2]])) || sets[model ? sets.length - 1 : 0];
}

const SCALE_STEPS = [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25];

/** The smallest "nice" ceiling with at most five ticks above zero. */
export function niceScale(dataMax: number): { max: number; step: number } {
  if (!(dataMax > 0)) return { max: 1, step: 0.25 };
  for (const step of SCALE_STEPS) {
    const ticks = Math.ceil(dataMax / step - 1e-9);
    if (ticks <= 5) return { max: Math.min(100, ticks * step), step };
  }
  return { max: 100, step: 25 };
}

export function buildRetentionModel(data: ProcessedRetentionData): RetentionModel {
  const periodCount = data.periods.length;

  const cohorts: RetentionCohortRow[] = data.periods.map((key, index) => {
    const raw = data.cohorts[key];
    const size = raw?.size ?? 0;
    const cells: RetentionCell[] = Array.from({ length: periodCount - index }, (_, offset) => {
      const users = raw?.counts[offset] ?? 0;
      return {
        offset,
        users,
        pct: size > 0 ? (users / size) * 100 : 0,
        partial: data.lastPeriodPartial && index + offset === periodCount - 1,
      };
    });
    return {
      key,
      index,
      size,
      cells,
      open: data.lastPeriodPartial && index === periodCount - 1,
      clipped: data.firstPeriodPartial && index === 0,
    };
  });

  const maxOffset = Math.max(periodCount - 1, 0);
  const average: (RetentionAverage | null)[] = Array.from({ length: maxOffset + 1 }, (_, offset) => {
    let users = 0;
    let size = 0;
    for (const cohort of cohorts) {
      const cell = cohort.cells[offset];
      if (!cell || cell.partial || cohort.size === 0) continue;
      users += cell.users;
      size += cohort.size;
    }
    return size > 0 ? { users, size, pct: (users / size) * 100 } : null;
  });

  const whole = cohorts.filter(cohort => !cohort.open && !cohort.clipped);
  const averageSize = whole.length > 0 ? whole.reduce((sum, cohort) => sum + cohort.size, 0) / whole.length : null;

  // A cohort of a few users can post any percentage; it has to be at least
  // half the usual size to be called the best.
  const minimumSize = averageSize === null ? 1 : Math.max(1, averageSize / 2);
  const best = cohorts
    .filter(cohort => cohort.size >= minimumSize && cohort.cells[1] && !cohort.cells[1].partial)
    .reduce<RetentionCohortRow | null>(
      (winner, cohort) => (winner === null || cohort.cells[1].pct > winner.cells[1].pct ? cohort : winner),
      null
    );

  let dataMax = 0;
  for (const cohort of cohorts) {
    if (cohort.size === 0) continue;
    for (const cell of cohort.cells) {
      if (cell.offset >= 1 && !cell.partial && cell.pct > dataMax) dataMax = cell.pct;
    }
  }
  const scale = niceScale(dataMax);

  return {
    mode: data.mode,
    cohorts,
    maxOffset,
    average,
    totalNew: cohorts.reduce((sum, cohort) => sum + cohort.size, 0),
    averageSize,
    best,
    scaleMax: scale.max,
    scaleStep: scale.step,
  };
}

export interface CohortOutlier {
  cohort: RetentionCohortRow;
  /** The cohort's period-1 retention, in percent. */
  pct: number;
  /** Percentage points above (positive) or below the all-cohort average. */
  difference: number;
}

const OUTLIER_SIZE_RATIO = 1.15;
const OUTLIER_MIN_DIFFERENCE = 1;
const OUTLIER_MIN_COHORTS = 3;

/**
 * The largest cohort, when it is clearly larger than usual and its period-1
 * retention sits at least a point away from the average: the case where a
 * spike in new users (a launch, a campaign) retained differently. Fixed
 * thresholds, no judgement: null whenever the data does not meet them.
 */
export function findCohortOutlier(model: RetentionModel): CohortOutlier | null {
  const average = model.average[1];
  if (!average || model.averageSize === null) return null;

  const measured = model.cohorts.filter(cohort => cohort.size > 0 && cohort.cells[1] && !cohort.cells[1].partial);
  if (measured.length < OUTLIER_MIN_COHORTS) return null;

  const largest = measured.reduce((winner, cohort) => (cohort.size > winner.size ? cohort : winner));
  if (largest.size < model.averageSize * OUTLIER_SIZE_RATIO) return null;

  const pct = largest.cells[1].pct;
  const difference = pct - average.pct;
  if (Math.abs(difference) < OUTLIER_MIN_DIFFERENCE) return null;

  return { cohort: largest, pct, difference };
}

/**
 * Stepped opacity ramp of the data hue. The jump from 0.44 to 0.64 skips the
 * band where neither light nor dark text reaches 4.5:1 on the dark panel, so
 * every label stays readable: light text up to step 4, dark text from step 5.
 * On the light panel dark text clears 4.5:1 on every step.
 */
export const HEAT_STEPS = [0.06, 0.12, 0.2, 0.3, 0.44, 0.64, 0.8, 0.96] as const;
export const HEAT_DARK_TEXT_FROM = 5;

export function heatStep(pct: number, scaleMax: number): number {
  const position = Math.max(0, Math.min(0.9999, scaleMax > 0 ? pct / scaleMax : 0));
  return Math.floor(position * HEAT_STEPS.length);
}

export const heatColor = (step: number) => `hsl(var(--dataviz) / ${HEAT_STEPS[step]})`;

export const formatPercent = (pct: number) => `${pct.toFixed(1)}%`;

/** The first and last day a cohort period covers, as calendar dates. */
export function periodDays(key: string, mode: RetentionMode): { first: DateTime; last: DateTime } {
  const first = DateTime.fromISO(key);
  return { first, last: mode === "week" ? first.plus({ days: 6 }) : first };
}

export interface PeriodProgress {
  /** Days of the last period the window has reached, counting the current one. */
  elapsedDays: number;
  totalDays: number;
  /** The first day after the last period, YYYY-MM-DD: when the next return period begins. */
  nextPeriod: string;
}

/** How far into its last period the window reaches. Null when that period is whole. */
export function lastPeriodProgress(data: ProcessedRetentionData): PeriodProgress | null {
  const lastKey = data.periods[data.periods.length - 1];
  if (!data.lastPeriodPartial || !lastKey) return null;

  const totalDays = data.mode === "week" ? 7 : 1;
  const start = DateTime.fromISO(lastKey, { zone: data.timeZone });
  const end = DateTime.fromISO(data.windowEnd, { zone: data.timeZone });
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.ceil(end.diff(start, "days").days)));

  return { elapsedDays, totalDays, nextPeriod: start.plus({ days: totalDays }).toISODate() ?? "" };
}

const WEEKLY_FROM_DAYS = 21;

/**
 * Daily cohorts for a short range, weekly for a longer one, until the viewer
 * picks: a week of data is a single weekly cohort with nothing to come back to.
 */
export function defaultRetentionMode(time: Time, zone: string): RetentionMode {
  const bounds = getAbsoluteBounds(time, zone);
  if (!bounds) return "week";
  return bounds.end.diff(bounds.start, "days").days < WEEKLY_FROM_DAYS ? "day" : "week";
}

/** One CSV row per cohort; in-progress cells are left blank rather than exported as final. */
export function retentionCsv(model: RetentionModel): { columns: string[]; rows: Record<string, unknown>[] } {
  const unit = model.mode === "week" ? "week" : "day";
  const offsets = Array.from({ length: model.maxOffset }, (_, i) => i + 1);
  const columns = [
    "cohort_start",
    "new_users",
    ...offsets.flatMap(offset => [`${unit}_${offset}_users`, `${unit}_${offset}_percent`]),
  ];
  const rows = model.cohorts.map(cohort => {
    const row: Record<string, unknown> = { cohort_start: cohort.key, new_users: cohort.size };
    for (const offset of offsets) {
      const cell = cohort.cells[offset];
      const final = cell && !cell.partial && cohort.size > 0;
      row[`${unit}_${offset}_users`] = final ? cell.users : "";
      row[`${unit}_${offset}_percent`] = final ? Number(cell.pct.toFixed(2)) : "";
    }
    return row;
  });
  return { columns, rows };
}
