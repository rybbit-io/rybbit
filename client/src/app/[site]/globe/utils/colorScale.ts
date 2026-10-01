import type { MapTone } from "./mapStyles";

/**
 * The map's colour scale: one hue (the data colour), value carried by opacity.
 * Counts sit on a power curve so the long tail of small places stays visible
 * next to the largest one; rates sit on a straight line between the lowest and
 * highest rate on the map.
 */
export type ScaleKind = "count" | "rate";

export interface ScaleTick {
  value: number;
  /** 0-1 along the legend bar. */
  position: number;
}

export interface ColorScale {
  kind: ScaleKind;
  min: number;
  max: number;
  /** Fill for a value; `lift` raises the opacity for a hovered place. */
  color: (value: number, lift?: number) => string;
  /** The same hue at a fixed opacity, for outlines and markers. */
  tint: (alpha: number) => string;
  /** The two ends of the legend bar. */
  range: [string, string];
  ticks: ScaleTick[];
}

const MIN_ALPHA = 0.16;
const MAX_ALPHA = 0.92;
const COUNT_EXPONENT = 0.4;

// "230 100% 85%", the dark theme's --dataviz, for when the variable cannot be read.
const FALLBACK_DATA_COLOR = "230 100% 85%";
// The same hue, dark enough to read on a light basemap.
const LIGHT_BASEMAP_DATA_COLOR = "230 75% 48%";

/** The data colour as "h s% l%", resolved from the theme for a dark basemap. */
export function readDataColor(tone: MapTone): string {
  if (tone === "light") return LIGHT_BASEMAP_DATA_COLOR;
  if (typeof document === "undefined") return FALLBACK_DATA_COLOR;
  return getComputedStyle(document.documentElement).getPropertyValue("--dataviz").trim() || FALLBACK_DATA_COLOR;
}

const toHsla = (hsl: string, alpha: number) => {
  const [h, s, l] = hsl.split(/\s+/);
  return `hsla(${h}, ${s}, ${l}, ${Number(alpha.toFixed(3))})`;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 1, 2 or 5 times a power of ten, whichever is nearest below the value. */
function niceFloor(value: number): number {
  if (value <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const lead = value / magnitude;
  return (lead >= 5 ? 5 : lead >= 2 ? 2 : 1) * magnitude;
}

// Legend labels need this much of the bar between them not to collide.
const MIN_TICK_GAP = 0.14;

function countTicks(max: number, position: (value: number) => number): ScaleTick[] {
  if (max <= 0) return [];
  // Evenly spaced along the bar, which on the power curve means these shares of the maximum.
  const candidates = [1, ...[0.25, 0.5, 0.75].map(p => niceFloor(max * p ** (1 / COUNT_EXPONENT)))];
  const ticks: ScaleTick[] = [];
  for (const value of candidates) {
    const at = position(value);
    const previous = ticks[ticks.length - 1];
    if (value >= max || at > 1 - MIN_TICK_GAP) continue;
    if (previous && (value <= previous.value || at - previous.position < MIN_TICK_GAP)) continue;
    ticks.push({ value, position: at });
  }
  return [...ticks, { value: max, position: 1 }];
}

export function createColorScale(values: number[], kind: ScaleKind, dataColor: string): ColorScale {
  const finite = values.filter(value => Number.isFinite(value));
  const max = finite.length ? Math.max(...finite) : 0;
  const min = kind === "rate" && finite.length ? Math.min(...finite) : 0;

  const position = (value: number) => {
    if (kind === "count") return max > 0 ? clamp01(value / max) ** COUNT_EXPONENT : 0;
    // Every place at the same rate: the middle of the bar, not an end.
    return max > min ? clamp01((value - min) / (max - min)) : 0.5;
  };
  const alpha = (value: number) => MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * position(value);

  const ticks: ScaleTick[] =
    kind === "count"
      ? countTicks(max, position)
      : max > min
        ? [
            { value: min, position: 0 },
            { value: (min + max) / 2, position: 0.5 },
            { value: max, position: 1 },
          ]
        : finite.length
          ? [{ value: max, position: 0.5 }]
          : [];

  return {
    kind,
    min,
    max,
    color: (value, lift = 0) => toHsla(dataColor, Math.min(1, alpha(value) + lift)),
    tint: tintAlpha => toHsla(dataColor, tintAlpha),
    range: [toHsla(dataColor, MIN_ALPHA), toHsla(dataColor, MAX_ALPHA)],
    ticks,
  };
}
