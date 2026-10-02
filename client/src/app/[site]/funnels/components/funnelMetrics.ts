import { FunnelResponse, FunnelStep, FunnelSummariesResponse, Goal, SavedFunnel } from "@/api/analytics/endpoints";
import { DeltaValue, percentDelta, pointDelta } from "@/lib/delta";
import { resolvePropertyFilters } from "@/lib/events";

/** One step of a funnel over one period. Rates are fractions (0 to 1). */
export interface StepMetrics {
  /** Sessions that reached the step. */
  sessions: number;
  /** Share of the sessions that entered the funnel. */
  ofStart: number;
  /** Share of the sessions that reached the step before. 1 on the first step. */
  fromPrevious: number;
  /** Share that went on to the next step. Null on the last step and when nobody reached this one. */
  continueRate: number | null;
  /** Sessions that reached this step and not the next: the people who left here. 0 on the last step. */
  dropped: number;
  medianSecondsToNext: number | null;
}

export interface FunnelMetrics {
  steps: StepMetrics[];
  entered: number;
  converted: number;
  /** Null when nobody entered: there is no rate to state. */
  conversion: number | null;
  medianSecondsToConvert: number | null;
  /** Index of the step that loses the largest share of the sessions reaching it. Null when nothing is lost. */
  worstStep: number | null;
}

export function computeFunnelMetrics(
  steps: { sessions: number; medianSecondsToNext?: number | null }[],
  medianSecondsToConvert: number | null = null
): FunnelMetrics {
  const entered = steps[0]?.sessions ?? 0;
  const converted = steps[steps.length - 1]?.sessions ?? 0;

  const metrics = steps.map((step, index): StepMetrics => {
    const before = steps[index - 1];
    const next = steps[index + 1];
    return {
      sessions: step.sessions,
      ofStart: entered > 0 ? step.sessions / entered : 0,
      fromPrevious: !before ? 1 : before.sessions > 0 ? step.sessions / before.sessions : 0,
      continueRate: next && step.sessions > 0 ? next.sessions / step.sessions : null,
      dropped: next ? Math.max(0, step.sessions - next.sessions) : 0,
      medianSecondsToNext: next ? (step.medianSecondsToNext ?? null) : null,
    };
  });

  let worstStep: number | null = null;
  metrics.forEach((step, index) => {
    if (step.continueRate === null || step.dropped === 0) return;
    const worst = worstStep === null ? null : metrics[worstStep];
    if (
      !worst ||
      step.continueRate < worst.continueRate! ||
      (step.continueRate === worst.continueRate && step.dropped > worst.dropped)
    ) {
      worstStep = index;
    }
  });

  return {
    steps: metrics,
    entered,
    converted,
    conversion: entered > 0 ? converted / entered : null,
    medianSecondsToConvert: steps.length > 1 && converted > 0 ? medianSecondsToConvert : null,
    worstStep,
  };
}

/**
 * A saved funnel's numbers out of a summary response. Null when the summary
 * does not cover the funnel, or was computed for a different set of steps (the
 * funnel was edited and the summary has not refetched yet).
 */
export function metricsFromSummary(
  funnel: SavedFunnel,
  response: FunnelSummariesResponse | undefined
): FunnelMetrics | null {
  const summary = response?.funnels.find(candidate => candidate.funnel_id === funnel.id);
  if (!summary || summary.steps.length !== funnel.steps.length) return null;

  return computeFunnelMetrics(
    summary.steps.map(step => ({ sessions: step.sessions, medianSecondsToNext: step.median_seconds_to_next })),
    summary.median_seconds_to_convert
  );
}

/** The analyze endpoint's rows as metrics. It reports no step times. */
export function metricsFromAnalysis(rows: FunnelResponse[]): FunnelMetrics {
  return computeFunnelMetrics(rows.map(row => ({ sessions: row.sessions })));
}

/** One row of the funnels list: the definition and its numbers for both periods. */
export interface FunnelRowData {
  funnel: SavedFunnel;
  /** Null while loading and when the summary does not cover the funnel. */
  current: FunnelMetrics | null;
  /** Null when the comparison is off, loading, or does not cover the funnel. */
  previous: FunnelMetrics | null;
}

/**
 * A rate for display: one decimal, two below 2% so that 0.49% is not printed
 * as 0.5%.
 */
export function formatRate(fraction: number): string {
  if (fraction === 0) return "0%";
  if (fraction === 1) return "100%";
  return `${(fraction * 100).toFixed(fraction < 0.02 ? 2 : 1)}%`;
}

/** Change of a rate in percentage points, with the precision `formatRate` prints the rates at. */
export function rateDelta(current: number | null | undefined, previous: number | null | undefined): DeltaValue | null {
  if (current == null || previous == null) return null;
  return pointDelta(current * 100, previous * 100, { decimals: Math.max(current, previous) < 0.02 ? 2 : 1 });
}

export const conversionDelta = (row: FunnelRowData) => rateDelta(row.current?.conversion, row.previous?.conversion);

const conversionChange = (row: FunnelRowData) =>
  row.current?.conversion != null && row.previous?.conversion != null
    ? row.current.conversion - row.previous.conversion
    : null;

/** "<1s", "58s", "1m 21s", "2h 5m". */
export function formatStepDuration(seconds: number): string {
  if (seconds < 1) return "<1s";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  return `${secs}s`;
}

export type FunnelSort = "entered" | "conversion" | "change" | "name" | "created";

// Missing numbers sort after every real one.
const descending = (a: number | null | undefined, b: number | null | undefined) =>
  (b ?? Number.NEGATIVE_INFINITY) - (a ?? Number.NEGATIVE_INFINITY);

/** `rows` arrive in creation order; every sort is stable on top of that. */
export function sortFunnels(rows: FunnelRowData[], sort: FunnelSort): FunnelRowData[] {
  const sorted = [...rows];
  switch (sort) {
    case "entered":
      return sorted.sort((a, b) => descending(a.current?.entered, b.current?.entered));
    case "conversion":
      return sorted.sort((a, b) => descending(a.current?.conversion, b.current?.conversion));
    case "change":
      return sorted.sort((a, b) => descending(conversionChange(a), conversionChange(b)));
    case "name":
      return sorted.sort((a, b) => a.funnel.name.localeCompare(b.funnel.name));
    case "created":
      return sorted;
  }
}

/** How many funnels convert better and worse than in the comparison period, at the printed precision. */
export function countMoves(rows: FunnelRowData[]): { improved: number; declined: number } {
  let improved = 0;
  let declined = 0;
  for (const row of rows) {
    const direction = conversionDelta(row)?.direction;
    if (direction === "up") improved++;
    if (direction === "down") declined++;
  }
  return { improved, declined };
}

// The funnel whose conversion moved furthest in one direction. A move that
// prints as 0.0 pp is not a move.
function biggestMove(rows: FunnelRowData[], direction: "up" | "down") {
  let best: { row: FunnelRowData; delta: DeltaValue; change: number } | null = null;
  for (const row of rows) {
    const delta = conversionDelta(row);
    const change = conversionChange(row);
    if (!delta || change === null || delta.direction !== direction) continue;
    if (!best || Math.abs(change) > Math.abs(best.change)) best = { row, delta, change };
  }
  return best;
}

export const biggestGain = (rows: FunnelRowData[]) => biggestMove(rows, "up");

export interface FunnelDecline {
  row: FunnelRowData;
  delta: DeltaValue;
  /** Change in sessions entering the funnel, when they rose while conversion fell. */
  enteredDelta: DeltaValue | null;
  /** Index of the step whose continue rate fell the most. */
  stepIndex: number;
}

/** The funnel whose conversion fell the most, and the step transition that lost the most ground. */
export function biggestDecline(rows: FunnelRowData[]): FunnelDecline | null {
  const worst = biggestMove(rows, "down");
  if (!worst) return null;

  const { current, previous } = worst.row;
  let stepIndex: number | null = null;
  let largestFall = 0;
  current!.steps.forEach((step, index) => {
    const before = previous!.steps[index]?.continueRate;
    if (step.continueRate === null || before == null) return;
    const fall = before - step.continueRate;
    if (fall > largestFall) {
      largestFall = fall;
      stepIndex = index;
    }
  });
  if (stepIndex === null) return null;

  const enteredDelta = percentDelta(current!.entered, previous!.entered);
  return {
    row: worst.row,
    delta: worst.delta,
    enteredDelta: enteredDelta?.direction === "up" ? enteredDelta : null,
    stepIndex,
  };
}

/** The funnel with the highest conversion this period: the stat band's third cell when there is no comparison. */
export function highestConversion(rows: FunnelRowData[]): FunnelRowData | null {
  let best: FunnelRowData | null = null;
  for (const row of rows) {
    if (row.current?.conversion == null) continue;
    if (!best || row.current.conversion > best.current!.conversion!) best = row;
  }
  return best;
}

/** The single step, across all funnels, that loses the largest share of the sessions reaching it. */
export function biggestDropOff(rows: FunnelRowData[]): { row: FunnelRowData; stepIndex: number; rate: number } | null {
  let worst: { row: FunnelRowData; stepIndex: number; rate: number; dropped: number } | null = null;
  for (const row of rows) {
    const stepIndex = row.current?.worstStep;
    if (stepIndex == null) continue;
    const step = row.current!.steps[stepIndex];
    const rate = 1 - step.continueRate!;
    if (!worst || rate > worst.rate || (rate === worst.rate && step.dropped > worst.dropped)) {
      worst = { row, stepIndex, rate, dropped: step.dropped };
    }
  }
  return worst && { row: worst.row, stepIndex: worst.stepIndex, rate: worst.rate };
}

/** A step's name as shown everywhere: its label, else what it matches, else its type. */
export const stepLabel = (step: FunnelStep, typeLabel: string) => step.name || step.value || typeLabel;

const filterKey = (filters: { key: string; value: string | number | boolean }[]) =>
  filters
    .map(filter => `${filter.key}=${String(filter.value)}`)
    .sort()
    .join("&");

/**
 * The goal that counts exactly what a funnel step matches: same kind of
 * target, same pattern, same property filters. A step limited to one hostname
 * is narrower than any goal, so it never matches.
 */
export function findMatchingGoal(step: FunnelStep, goals: Goal[]): Goal | undefined {
  if (step.hostname) return undefined;
  const stepFilters = filterKey(resolvePropertyFilters(step));

  return goals.find(goal => {
    if (filterKey(resolvePropertyFilters(goal.config)) !== stepFilters) return false;
    if (step.type === "page") return goal.goalType === "path" && goal.config.pathPattern === step.value;
    if (step.type === "event") return goal.goalType === "event" && goal.config.eventName === step.value;
    return goal.goalType === step.type && (goal.config.valuePattern ?? "").trim() === (step.value ?? "").trim();
  });
}

/** The funnels whose name or steps contain the search text. */
export function searchFunnels(rows: FunnelRowData[], search: string): FunnelRowData[] {
  const query = search.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter(
    ({ funnel }) =>
      funnel.name.toLowerCase().includes(query) ||
      funnel.steps.some(step => step.value.toLowerCase().includes(query) || step.name?.toLowerCase().includes(query))
  );
}
