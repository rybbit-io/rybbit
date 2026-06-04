import type { CustomQueryRow } from "../../../api/analytics/endpoints";
import type { DashboardCard, DashboardCardMapping, DashboardConfig, TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";

export const CARD_PALETTE = [
  "hsla(217, 75%, 60%, 0.9)",
  "hsla(142, 65%, 48%, 0.9)",
  "hsla(24, 80%, 60%, 0.9)",
  "hsla(280, 62%, 62%, 0.9)",
  "hsla(190, 78%, 52%, 0.9)",
  "hsla(340, 70%, 62%, 0.9)",
  "hsla(48, 80%, 55%, 0.9)",
  "hsla(160, 58%, 48%, 0.9)",
];

const DEFAULT_SQL =
  "SELECT toStartOfInterval(timestamp, INTERVAL {{bucket}}) AS time, count() AS pageviews\nFROM scoped_events\nWHERE type = 'pageview'\nGROUP BY time\nORDER BY time";

export function createCard(index: number, existing: DashboardCard[]): DashboardCard {
  // Stack new cards below the lowest existing card.
  const maxBottom = existing.reduce((max, card) => Math.max(max, card.gridPos.y + card.gridPos.h), 0);
  return {
    id: `card-${Date.now()}-${index}`,
    title: `Card ${index}`,
    sql: DEFAULT_SQL,
    vizType: "line",
    mapping: {},
    gridPos: { x: 0, y: maxBottom, w: 6, h: 6 },
  };
}

export function isEmptyConfig(config: DashboardConfig | undefined): boolean {
  return !config || config.cards.length === 0;
}

/** ClickHouse JSONEachRow returns numbers as strings; coerce, dropping NaN. */
export function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function formatAxisValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export type WideChartData = {
  data: Record<string, string | number>[];
  keys: string[];
  indexBy: string;
};

/**
 * Transform query rows into wide-format chart data (one object per x value, a
 * numeric field per series). Drives both the line and bar cards.
 * - With seriesColumn: pivot distinct series values into keys, value = first yColumn.
 * - Without: keys = yColumns.
 */
export function buildWideData(rows: CustomQueryRow[], mapping: DashboardCardMapping): WideChartData | null {
  const { xColumn, yColumns, seriesColumn } = mapping;
  if (!xColumn || !yColumns || yColumns.length === 0) return null;

  if (seriesColumn) {
    const yColumn = yColumns[0];
    const keys = new Set<string>();
    const byIndex = new Map<string, Record<string, string | number>>();
    for (const row of rows) {
      const indexValue = formatAxisValue(row[xColumn]);
      const seriesKey = formatAxisValue(row[seriesColumn]);
      const y = coerceNumber(row[yColumn]);
      keys.add(seriesKey);
      if (!byIndex.has(indexValue)) byIndex.set(indexValue, { [xColumn]: indexValue });
      byIndex.get(indexValue)![seriesKey] = y ?? 0;
    }
    return { data: Array.from(byIndex.values()), keys: Array.from(keys), indexBy: xColumn };
  }

  const data = rows.map(row => {
    const entry: Record<string, string | number> = { [xColumn]: formatAxisValue(row[xColumn]) };
    for (const yColumn of yColumns) {
      entry[yColumn] = coerceNumber(row[yColumn]) ?? 0;
    }
    return entry;
  });
  return { data, keys: yColumns, indexBy: xColumn };
}

// ── X-axis tick formatting ───────────────────────────────────────────────────

const TICK_TARGET = 8;

/** Parse a ClickHouse date/datetime string ("yyyy-MM-dd[ HH:mm:ss]"). */
export function parseChartDate(value: unknown): DateTime | null {
  if (typeof value !== "string" || value === "") return null;
  let dt = DateTime.fromSQL(value, { zone: "utc" });
  if (!dt.isValid) dt = DateTime.fromISO(value, { zone: "utc" });
  return dt.isValid ? dt : null;
}

/** Luxon format string per bucket, mirroring TimeSeriesChart's tick formatting. */
function bucketTickFormat(bucket: TimeBucket): string {
  switch (bucket) {
    case "minute":
    case "five_minutes":
    case "ten_minutes":
    case "fifteen_minutes":
    case "hour":
      return "HH:mm";
    case "day":
    case "week":
      return "MMM d";
    case "month":
      return "MMM yyyy";
    case "year":
      return "yyyy";
    default:
      return "MMM d";
  }
}

/** Evenly sample values down to ~TICK_TARGET so labels don't overflow. */
function strideValues(values: string[], target = TICK_TARGET): string[] | undefined {
  if (values.length <= target) return undefined; // let Nivo render every tick
  const stride = Math.ceil(values.length / target);
  return values.filter((_, index) => index % stride === 0);
}

export type ChartAxis = {
  isTime: boolean;
  format: (value: unknown) => string;
  tickValues: string[] | undefined;
};

/**
 * Build an axis tick formatter + thinned tick set for the X column. Datetime
 * values are formatted by bucket (e.g. "18:00", "Jun 3") instead of the raw
 * "2026-06-03 18:00:00"; long categorical labels are truncated.
 */
export function buildChartAxis(values: string[], bucket: TimeBucket): ChartAxis {
  const sample = values.find(value => value !== "" && value != null);
  const isTime = sample != null && parseChartDate(sample) !== null;

  if (isTime) {
    const fmt = bucketTickFormat(bucket);
    return {
      isTime: true,
      format: value => {
        const dt = parseChartDate(value);
        return dt ? dt.toFormat(fmt) : String(value ?? "");
      },
      tickValues: strideValues(values),
    };
  }

  return {
    isTime: false,
    format: value => {
      const text = String(value ?? "");
      return text.length > 16 ? `${text.slice(0, 15)}…` : text;
    },
    tickValues: strideValues(values),
  };
}

/** Ordered, de-duplicated list of X values from rows for the given column. */
export function getXValues(rows: CustomQueryRow[], xColumn: string | undefined): string[] {
  if (!xColumn) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const value = formatAxisValue(row[xColumn]);
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}
