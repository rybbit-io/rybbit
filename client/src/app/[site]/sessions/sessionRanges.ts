/**
 * The Sessions page's min/max ranges: how many pageviews, how many events and
 * how long. Pure, so the popover, the request and the labels cannot disagree
 * about what a range means.
 */
export type RangeMetric = "pageviews" | "events" | "duration";

export interface RangeValue {
  min?: number;
  max?: number;
}

export type SessionRanges = Record<RangeMetric, RangeValue>;

export const EMPTY_RANGES: SessionRanges = { pageviews: {}, events: {}, duration: {} };

// The server binds these as Int32.
const MAX_BOUND = 2_147_483_647;

/** A typed bound: a whole number of zero or more, or nothing. */
export function parseBound(text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  return Math.min(Number(trimmed), MAX_BOUND);
}

/**
 * What the two inputs mean together. "At least 0" is no bound, and bounds
 * typed the wrong way round are swapped rather than matching nothing.
 */
export function toRange(minText: string, maxText: string): RangeValue {
  let min = parseBound(minText);
  let max = parseBound(maxText);
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  if (min === 0) min = undefined;
  return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
}

export const hasRange = (range: RangeValue) => range.min !== undefined || range.max !== undefined;

export const hasAnyRange = (ranges: SessionRanges) => Object.values(ranges).some(hasRange);

/** How a range reads on its chip; the component supplies the words. */
export type RangeDescription =
  | { kind: "any" }
  | { kind: "exact"; value: number }
  | { kind: "min"; min: number }
  | { kind: "max"; max: number }
  | { kind: "between"; min: number; max: number };

export function describeRange({ min, max }: RangeValue): RangeDescription {
  if (min !== undefined && max !== undefined)
    return min === max ? { kind: "exact", value: min } : { kind: "between", min, max };
  if (min !== undefined) return { kind: "min", min };
  if (max !== undefined) return { kind: "max", max };
  return { kind: "any" };
}

/** The ranges as the sessions hooks take them. */
export const toRangeParams = (ranges: SessionRanges) => ({
  minPageviews: ranges.pageviews.min,
  maxPageviews: ranges.pageviews.max,
  minEvents: ranges.events.min,
  maxEvents: ranges.events.max,
  minDuration: ranges.duration.min,
  maxDuration: ranges.duration.max,
});
