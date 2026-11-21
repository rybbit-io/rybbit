import { SiteEventCountPoint } from "../../../../api/analytics/endpoints";

/**
 * Series colours for this page's charts: the data hue leads, then a ramp whose
 * steps differ in lightness as well as hue. No emerald (it means action) and
 * no red (it means a problem).
 */
export const SERIES_COLORS = [
  "hsl(var(--dataviz))",
  "hsl(var(--orange-400))",
  "hsl(var(--teal-500))",
  "hsl(var(--pink-400))",
  "hsl(var(--amber-300))",
  "hsl(var(--violet-500))",
  "hsl(var(--neutral-400))",
  "hsl(var(--sky-400))",
  "hsl(var(--lime-400))",
  "hsl(var(--rose-300))",
] as const;

export const seriesColor = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

/** Every type the events/count endpoint breaks out, including web vitals. */
export type ChartEventType =
  | "custom_event"
  | "button_click"
  | "outbound"
  | "input_change"
  | "copy"
  | "form_submit"
  | "error"
  | "pageview"
  | "performance";

type CountKey = Exclude<keyof SiteEventCountPoint, "time" | "event_count">;

export interface EventTypeSeries {
  type: ChartEventType;
  countKey: CountKey;
  color: string;
  /** One row per pageview: on the same axis it flattens every other type. */
  hiddenByDefault?: boolean;
  /** False where a rise is bad news. */
  upIsGood?: boolean;
}

// The order is the legend's, and it fixes each type's colour.
export const EVENT_TYPE_SERIES: EventTypeSeries[] = [
  { type: "custom_event", countKey: "custom_event_count", color: SERIES_COLORS[0] },
  { type: "button_click", countKey: "button_click_count", color: SERIES_COLORS[1] },
  { type: "outbound", countKey: "outbound_count", color: SERIES_COLORS[2] },
  { type: "input_change", countKey: "input_change_count", color: SERIES_COLORS[3] },
  { type: "copy", countKey: "copy_count", color: SERIES_COLORS[4] },
  { type: "form_submit", countKey: "form_submit_count", color: SERIES_COLORS[5] },
  { type: "error", countKey: "error_count", color: SERIES_COLORS[6], upIsGood: false },
  { type: "pageview", countKey: "pageview_count", color: SERIES_COLORS[7], hiddenByDefault: true },
  { type: "performance", countKey: "performance_count", color: SERIES_COLORS[8], hiddenByDefault: true },
];

export const DEFAULT_HIDDEN_TYPES: ReadonlySet<string> = new Set(
  EVENT_TYPE_SERIES.filter(series => series.hiddenByDefault).map(series => series.type)
);

/** The period's total for each type. */
export function totalsByType(points: SiteEventCountPoint[] | undefined): Record<ChartEventType, number> {
  const totals = Object.fromEntries(EVENT_TYPE_SERIES.map(series => [series.type, 0])) as Record<
    ChartEventType,
    number
  >;
  for (const point of points ?? []) {
    for (const series of EVENT_TYPE_SERIES) {
      totals[series.type] += Number(point[series.countKey]) || 0;
    }
  }
  return totals;
}
