import { Filter } from "@rybbit/shared";
import { Goal, GoalConfig, GoalType, SavedFunnel } from "@/api/analytics/endpoints";
import { DeltaValue, percentChange, percentDelta, pointDelta } from "@/lib/delta";
import { isAutocaptureTargetType, resolvePropertyFilters } from "@/lib/events";

/** Decimal places for a conversion rate and for its change in percentage points. */
export const RATE_DECIMALS = 2;

/** A goal with this period's numbers and, when a comparison is on, how they moved. */
export interface LedgerRow {
  goal: Goal;
  /** The goal's name, or the page's stand-in for a goal saved without one. */
  label: string;
  conversions: number;
  /** Conversions divided by sessions, 0–1. */
  rate: number;
  /** Null when there is no comparison period (turned off, still loading, or the goal is missing from it). */
  previousConversions: number | null;
  previousRate: number | null;
  conversionsDelta: DeltaValue | null;
  rateDelta: DeltaValue | null;
  /** Percent change in conversions; null without a baseline to divide by. */
  conversionsChange: number | null;
  /** Change of the rate in percentage points. */
  rateChange: number | null;
}

export type LedgerSortKey = "name" | "conversions" | "conversionsChange" | "rate" | "rateChange";
export type SortOrder = "asc" | "desc";
export interface LedgerSort {
  key: LedgerSortKey;
  order: SortOrder;
}

export const DEFAULT_LEDGER_SORT: LedgerSort = { key: "conversions", order: "desc" };

/** What the goal matches: its path pattern, event name, or autocapture value pattern. */
export function goalPattern(goal: { goalType: GoalType; config: GoalConfig }): string {
  if (goal.goalType === "path") return goal.config.pathPattern ?? "";
  if (goal.goalType === "event") return goal.config.eventName ?? "";
  return goal.config.valuePattern ?? "";
}

const roundTo = (value: number, decimals: number) => Number(value.toFixed(decimals));

/**
 * Joins this period's goals with the comparison period's by id. `previous` is
 * undefined while the comparison is off or loading: every delta is then null
 * and draws nothing.
 */
export function buildLedgerRows(
  current: Goal[],
  previous: Goal[] | undefined,
  labelOf: (goal: Goal) => string = goal => goal.name || goalPattern(goal)
): LedgerRow[] {
  const previousById = new Map(previous?.map(goal => [goal.goalId, goal]));

  return current.map(goal => {
    const before = previousById.get(goal.goalId);
    const previousConversions = before ? before.total_conversions : null;
    const previousRate = before ? before.conversion_rate : null;

    return {
      goal,
      label: labelOf(goal),
      conversions: goal.total_conversions,
      rate: goal.conversion_rate,
      previousConversions,
      previousRate,
      conversionsDelta: percentDelta(goal.total_conversions, previousConversions),
      rateDelta: pointDelta(goal.conversion_rate * 100, previousRate === null ? null : previousRate * 100, {
        decimals: RATE_DECIMALS,
      }),
      conversionsChange:
        previousConversions === null ? null : percentChange(goal.total_conversions, previousConversions),
      rateChange: previousRate === null ? null : (goal.conversion_rate - previousRate) * 100,
    };
  });
}

/** Case-insensitive match on the goal's label, what it matches, and its property filters. */
export function matchesGoalSearch({ goal, label }: Pick<LedgerRow, "goal" | "label">, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    label,
    goalPattern(goal),
    ...resolvePropertyFilters(goal.config).flatMap(filter => [filter.key, String(filter.value)]),
  ];
  return haystack.some(text => !!text && text.toLowerCase().includes(query));
}

/**
 * Sorts every row, not a page of them. Rows with no value for the sorted
 * column (a change without a baseline) go last in either direction; ties fall
 * back to conversions, then to the goal id so the order never flickers.
 */
export function sortLedgerRows(rows: LedgerRow[], sort: LedgerSort): LedgerRow[] {
  const direction = sort.order === "asc" ? 1 : -1;
  const tieBreak = (a: LedgerRow, b: LedgerRow) => b.conversions - a.conversions || a.goal.goalId - b.goal.goalId;

  return [...rows].sort((a, b) => {
    if (sort.key === "name") {
      return direction * a.label.localeCompare(b.label, undefined, { sensitivity: "base" }) || tieBreak(a, b);
    }

    const left = a[sort.key];
    const right = b[sort.key];
    if (left === null || right === null) {
      if (left === right) return tieBreak(a, b);
      return left === null ? 1 : -1;
    }
    return direction * (left - right) || tieBreak(a, b);
  });
}

/**
 * The goal whose conversions grew the most against the comparison period, in
 * percent. Null when nothing grew: a goal needs a baseline to have moved, and
 * growth that rounds to 0.0% is not a move.
 */
export function bestMover(rows: LedgerRow[]): LedgerRow | null {
  const movers = rows.filter(row => row.conversionsChange !== null && roundTo(row.conversionsChange, 1) > 0);
  if (movers.length === 0) return null;
  return sortLedgerRows(movers, { key: "conversionsChange", order: "desc" })[0];
}

/**
 * The goal whose conversion rate fell the most, in percentage points. Null
 * when no rate fell by at least the precision the page prints.
 */
export function slippingGoal(rows: LedgerRow[]): LedgerRow | null {
  const slipping = rows.filter(row => row.rateChange !== null && roundTo(row.rateChange, RATE_DECIMALS) < 0);
  if (slipping.length === 0) return null;
  return sortLedgerRows(slipping, { key: "rateChange", order: "asc" })[0];
}

/**
 * The path-goal wildcard syntax as an anchored regex: `*` is one path segment,
 * `**` crosses segments. Mirrors the server's `patternToRegex`
 * (server/src/api/analytics/utils/utils.ts), which is what a path goal is
 * counted with; keep the two in step.
 */
export function pathPatternToRegex(pattern: string): string {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const withDoubleStar = escaped.replace(/\*\*/g, "{{DOUBLE_STAR}}");
  const withSingleStar = withDoubleStar.replace(/\*/g, "[^/]+");
  return `^${withSingleStar.replace(/{{DOUBLE_STAR}}/g, ".*")}$`;
}

// The server refuses a regex filter longer than this (getFilterStatement).
const MAX_REGEX_FILTER_LENGTH = 500;

/**
 * The filters that select the sessions behind a goal on another page, or null
 * when the filter set cannot say what the goal says. A pivot built from a
 * looser filter would list sessions that did not convert, so those goals get
 * no pivot:
 *  - autocapture goals: there is no filter on the event type
 *  - goals narrowed by URL parameters or event properties
 */
export function goalPivotFilters(goal: { goalType: GoalType; config: GoalConfig }): Filter[] | null {
  if (isAutocaptureTargetType(goal.goalType)) return null;
  if (resolvePropertyFilters(goal.config).length > 0) return null;

  if (goal.goalType === "event") {
    const eventName = goal.config.eventName;
    return eventName ? [{ parameter: "event_name", type: "equals", value: [eventName] }] : null;
  }

  const pattern = goal.config.pathPattern;
  if (!pattern) return null;
  if (!pattern.includes("*")) return [{ parameter: "pathname", type: "equals", value: [pattern] }];

  const regex = pathPatternToRegex(pattern);
  return regex.length > MAX_REGEX_FILTER_LENGTH ? null : [{ parameter: "pathname", type: "regex", value: [regex] }];
}

export interface FunnelRef {
  funnel: SavedFunnel;
  /** 1-based position of the matching step. */
  step: number;
  of: number;
}

/**
 * Saved funnels with a step that targets the same thing as the goal: the same
 * page pattern, the same event, or the same autocapture type and pattern.
 */
export function funnelRefs(goal: { goalType: GoalType; config: GoalConfig }, funnels: SavedFunnel[]): FunnelRef[] {
  const stepType = goal.goalType === "path" ? "page" : goal.goalType;
  const pattern = goalPattern(goal);
  if (!pattern && !isAutocaptureTargetType(goal.goalType)) return [];

  return funnels.flatMap(funnel => {
    const index = funnel.steps.findIndex(step => step.type === stepType && (step.value ?? "") === pattern);
    return index < 0 ? [] : [{ funnel, step: index + 1, of: funnel.steps.length }];
  });
}

/** "4.73%": a 0–1 rate at the page's precision. */
export const formatRate = (rate: number) => `${(rate * 100).toFixed(RATE_DECIMALS)}%`;
