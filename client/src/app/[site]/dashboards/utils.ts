import type { CustomQueryRow } from "../../../api/analytics/endpoints";
import type {
  DashboardCard,
  DashboardCardMapping,
  DashboardConfig,
  DashboardValueFormat,
  DashboardVizType,
  TimeBucket,
} from "@rybbit/shared";
import { DateTime } from "luxon";
import { getTimezone } from "@/lib/store";
import { formatSecondsAsMinutesAndSeconds, formatter } from "@/lib/utils";
import type { DashboardExample } from "./examples";

// Mirror of the server's MAX_CARDS_PER_DASHBOARD (enforced in dashboardSchema).
// Kept as a client-local literal because @rybbit/shared is a types-only package
// here — importing a runtime value from it fails at build/runtime. Keep in sync.
export const MAX_CARDS_PER_DASHBOARD = 20;

export const CARD_PALETTE = [
  // Lead with the brand data hue (--dataviz periwinkle); escalate to distinct
  // hues only when a chart has many categories to separate (DESIGN.md).
  "hsl(var(--dataviz))",
  "hsla(142, 65%, 48%, 0.9)",
  "hsla(24, 80%, 60%, 0.9)",
  "hsla(280, 62%, 62%, 0.9)",
  "hsla(190, 78%, 52%, 0.9)",
  "hsla(340, 70%, 62%, 0.9)",
  "hsla(48, 80%, 55%, 0.9)",
  "hsla(160, 58%, 48%, 0.9)",
];

/** Y just below the lowest existing card, so new cards stack rather than overlap. */
function nextStackY(existing: DashboardCard[]): number {
  return existing.reduce((max, card) => Math.max(max, card.gridPos.y + card.gridPos.h), 0);
}

/** Sensible default footprint per chart type so presets land at a usable size. */
const VIZ_DEFAULT_SIZE: Record<DashboardVizType, { w: number; h: number }> = {
  line: { w: 6, h: 5 },
  area: { w: 6, h: 5 },
  bar: { w: 6, h: 5 },
  hbar: { w: 4, h: 6 },
  pie: { w: 4, h: 5 },
  stat: { w: 3, h: 3 },
  table: { w: 6, h: 6 },
  map: { w: 6, h: 6 },
  calendar: { w: 8, h: 4 },
};

export function createCard(index: number, existing: DashboardCard[]): DashboardCard {
  return {
    id: `card-${Date.now()}-${index}`,
    title: `Card ${index}`,
    sql: "",
    vizType: "line",
    mapping: {},
    gridPos: { x: 0, y: nextStackY(existing), w: 6, h: 6 },
  };
}

/** A ready-to-render card seeded from a preset's query, chart type, and mapping. */
export function createCardFromExample(
  index: number,
  existing: DashboardCard[],
  example: DashboardExample
): DashboardCard {
  const size = VIZ_DEFAULT_SIZE[example.vizType] ?? { w: 6, h: 6 };
  return {
    id: `card-${Date.now()}-${index}`,
    title: example.title,
    sql: example.sql,
    vizType: example.vizType,
    mapping: {
      ...example.mapping,
      yColumns: example.mapping.yColumns ? [...example.mapping.yColumns] : undefined,
    },
    gridPos: { x: 0, y: nextStackY(existing), w: size.w, h: size.h },
  };
}

/** Duplicate a card with a fresh id, "(copy)" title, placed just below the original. */
export function cloneCard(card: DashboardCard): DashboardCard {
  return {
    ...card,
    id: `card-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    title: `${card.title} (copy)`,
    mapping: {
      ...card.mapping,
      yColumns: card.mapping.yColumns ? [...card.mapping.yColumns] : undefined,
    },
    gridPos: { ...card.gridPos, y: card.gridPos.y + card.gridPos.h },
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
        return dt ? dt.setZone(getTimezone()).toFormat(fmt) : String(value ?? "");
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

// ── Value formatting ─────────────────────────────────────────────────────────

/** Format a single magnitude for stat / map / calendar cards. */
export function formatValue(value: number, format: DashboardValueFormat = "number"): string {
  switch (format) {
    case "percent":
      return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
    case "duration":
      return formatSecondsAsMinutesAndSeconds(Math.round(value));
    case "bytes": {
      if (value === 0) return "0 B";
      const units = ["B", "KB", "MB", "GB", "TB", "PB"];
      const exponent = Math.min(units.length - 1, Math.floor(Math.log(Math.abs(value)) / Math.log(1024)));
      const scaled = value / 1024 ** exponent;
      return `${scaled >= 100 || Number.isInteger(scaled) ? Math.round(scaled) : scaled.toFixed(1)} ${units[exponent]}`;
    }
    default:
      return formatter(value);
  }
}

/** First column whose first non-empty value parses as a number. */
export function firstNumericColumn(rows: CustomQueryRow[]): string | undefined {
  if (rows.length === 0) return undefined;
  for (const column of Object.keys(rows[0])) {
    if (rows.some(row => coerceNumber(row[column]) !== null)) return column;
  }
  return undefined;
}

// ── Single-value (stat) ──────────────────────────────────────────────────────

export type StatValue = { value: number; label: string | null };

/** Resolve the single figure for a stat card from the first row. */
export function getStatValue(rows: CustomQueryRow[], mapping: DashboardCardMapping): StatValue | null {
  if (rows.length === 0) return null;
  const row = rows[0];
  const valueColumn = mapping.valueColumn ?? firstNumericColumn(rows);
  if (!valueColumn) return null;
  const value = coerceNumber(row[valueColumn]);
  if (value === null) return null;
  const label = mapping.xColumn && row[mapping.xColumn] != null ? formatAxisValue(row[mapping.xColumn]) : null;
  return { value, label };
}

// ── Pie / donut ──────────────────────────────────────────────────────────────

export type PieSlice = { label: string; value: number };

const PIE_MAX_SLICES = 11;

/** Label/value slices for a pie card, sorted desc with a rolled-up "Other". */
export function buildPieData(rows: CustomQueryRow[], mapping: DashboardCardMapping): PieSlice[] {
  const labelColumn = mapping.xColumn;
  const valueColumn = mapping.valueColumn ?? firstNumericColumn(rows);
  if (!labelColumn || !valueColumn) return [];

  const slices = rows
    .map(row => ({ label: formatAxisValue(row[labelColumn]), value: coerceNumber(row[valueColumn]) ?? 0 }))
    .filter(slice => slice.value > 0)
    .sort((a, b) => b.value - a.value);

  if (slices.length <= PIE_MAX_SLICES) return slices;
  const head = slices.slice(0, PIE_MAX_SLICES);
  const rest = slices.slice(PIE_MAX_SLICES).reduce((sum, slice) => sum + slice.value, 0);
  return rest > 0 ? [...head, { label: "Other", value: rest }] : head;
}

// ── Map (country choropleth) ─────────────────────────────────────────────────

export type CountryData = { byCode: Map<string, number>; max: number };

/** ISO_A2 → value lookup for a map card. Codes are upper-cased to match GeoJSON. */
export function buildCountryData(rows: CustomQueryRow[], mapping: DashboardCardMapping): CountryData {
  const countryColumn = mapping.countryColumn;
  const valueColumn = mapping.valueColumn ?? firstNumericColumn(rows);
  const byCode = new Map<string, number>();
  let max = 0;
  if (!countryColumn || !valueColumn) return { byCode, max };
  for (const row of rows) {
    const code = formatAxisValue(row[countryColumn]).toUpperCase();
    if (!code) continue;
    const value = (byCode.get(code) ?? 0) + (coerceNumber(row[valueColumn]) ?? 0);
    byCode.set(code, value);
    if (value > max) max = value;
  }
  return { byCode, max };
}

// ── Calendar heatmap ─────────────────────────────────────────────────────────

export type CalendarDatum = { day: string; value: number };
export type CalendarData = { data: CalendarDatum[]; from: string; to: string };

/** Day/value data plus the date span for a calendar card. */
export function buildCalendarData(rows: CustomQueryRow[], mapping: DashboardCardMapping): CalendarData | null {
  const dateColumn = mapping.dateColumn ?? mapping.xColumn;
  const valueColumn = mapping.valueColumn ?? firstNumericColumn(rows);
  if (!dateColumn || !valueColumn) return null;

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const parsed = parseChartDate(row[dateColumn]);
    if (!parsed) continue;
    const day = parsed.toFormat("yyyy-LL-dd");
    byDay.set(day, (byDay.get(day) ?? 0) + (coerceNumber(row[valueColumn]) ?? 0));
  }
  if (byDay.size === 0) return null;

  const days = Array.from(byDay.keys()).sort();
  return {
    data: days.map(day => ({ day, value: byDay.get(day)! })),
    from: days[0],
    to: days[days.length - 1],
  };
}
