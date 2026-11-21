/**
 * Change against the comparison period, in the one shape every site page draws
 * it: a direction for the arrow and the colour, the magnitude to print beside
 * the arrow, and the signed form for sentences and screen readers.
 */

/**
 * `flat` is a change that rounds to nothing; `none` is a comparison period
 * with nothing in it, where a percentage has no meaning.
 */
export type DeltaDirection = "up" | "down" | "flat" | "none";

export type DeltaTone = "good" | "bad" | "neutral";

export interface DeltaValue {
  direction: DeltaDirection;
  /** Magnitude without a sign, to sit beside an arrow: "12.4%", "2.1 pp". */
  text: string;
  /** The same change with its sign, for prose and screen readers: "+12.4%", "-2.1 pp". */
  signed: string;
}

export interface DeltaOptions {
  /** Decimal places. Defaults to 1. */
  decimals?: number;
}

/** Printed where a number would be when the comparison period is empty. */
export const NO_DELTA_TEXT = "—";

// Past this a percentage stops being read as a number, and the stat band needs
// a bounded width.
const MAX_PERCENT = 999;

const isNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

// Rounds first so the sign is taken from what is printed: -0.04 at one decimal
// is "0.0", not "-0.0".
const roundTo = (value: number, decimals: number) => {
  const rounded = Number(value.toFixed(decimals));
  return rounded === 0 ? 0 : rounded;
};

const sign = (value: number) => (value > 0 ? "+" : value < 0 ? "-" : "");

const directionOf = (value: number): DeltaDirection => (value > 0 ? "up" : value < 0 ? "down" : "flat");

/**
 * Relative change in percent: 120 against 100 is 20. Null when there is no
 * baseline to divide by.
 */
export function percentChange(current: number, previous: number): number | null {
  if (!isNumber(current) || !isNumber(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** "+12.4%", "-3.1%", "0.0%"; anything past 999% is ">999%". */
export function formatPercentChange(change: number, { decimals = 1 }: DeltaOptions = {}): string {
  const rounded = roundTo(change, decimals);
  if (Math.abs(rounded) > MAX_PERCENT) return `${rounded > 0 ? ">" : "<-"}${MAX_PERCENT}%`;
  return `${sign(rounded)}${Math.abs(rounded).toFixed(decimals)}%`;
}

/** "+2.1 pp", "-0.3 pp", "0.0 pp". Percentage points are always written "pp". */
export function formatPointChange(change: number, { decimals = 1 }: DeltaOptions = {}): string {
  const rounded = roundTo(change, decimals);
  return `${sign(rounded)}${Math.abs(rounded).toFixed(decimals)} pp`;
}

/**
 * Percent change of a count or a duration against the comparison period.
 *
 * Null when either side is missing (comparison turned off, or the previous
 * period still loading or failed): there is nothing to draw. A comparison
 * period of zero gives the neutral `none` state rather than an invented
 * percentage.
 */
export function percentDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  { decimals = 1 }: DeltaOptions = {}
): DeltaValue | null {
  if (!isNumber(current) || !isNumber(previous)) return null;

  // Nothing before and nothing now is no change; nothing before and something
  // now has no baseline to be a percentage of.
  if (previous === 0 && current !== 0) return { direction: "none", text: NO_DELTA_TEXT, signed: NO_DELTA_TEXT };

  const change = roundTo(percentChange(current, previous) ?? 0, decimals);
  const signed = formatPercentChange(change, { decimals });

  return {
    direction: directionOf(change),
    // ">999%" keeps its marker beside the arrow; everything else drops the sign.
    text: Math.abs(change) > MAX_PERCENT ? `>${MAX_PERCENT}%` : signed.replace(/^[+-]/, ""),
    signed,
  };
}

/**
 * Change of a rate in percentage points. Both sides are percentages on the
 * same 0–100 scale: 43.3 against 41.2 is "+2.1 pp".
 *
 * Null when either side is missing, as with `percentDelta`.
 */
export function pointDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  { decimals = 1 }: DeltaOptions = {}
): DeltaValue | null {
  if (!isNumber(current) || !isNumber(previous)) return null;

  const change = roundTo(current - previous, decimals);
  const signed = formatPointChange(change, { decimals });

  return { direction: directionOf(change), text: signed.replace(/^[+-]/, ""), signed };
}

/**
 * Whether a move is good news. Up is good unless the metric says otherwise
 * (bounce rate, load time, errors); no move and no baseline are neutral.
 */
export function deltaTone(direction: DeltaDirection, upIsGood = true): DeltaTone {
  if (direction === "flat" || direction === "none") return "neutral";
  return (direction === "up") === upIsGood ? "good" : "bad";
}
