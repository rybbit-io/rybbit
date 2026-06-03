import type { CustomQueryRow } from "../../../api/analytics/endpoints";
import type { DashboardCard, DashboardCardMapping, DashboardConfig } from "@rybbit/shared";

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

export type NivoLineSeries = {
  id: string;
  data: { x: string; y: number }[];
};

/**
 * Transform query rows into Nivo line series based on the column mapping.
 * - With seriesColumn: one series per distinct value, y = first yColumn.
 * - Without: one series per yColumn.
 */
export function buildLineSeries(rows: CustomQueryRow[], mapping: DashboardCardMapping): NivoLineSeries[] {
  const { xColumn, yColumns, seriesColumn } = mapping;
  if (!xColumn || !yColumns || yColumns.length === 0) return [];

  if (seriesColumn) {
    const yColumn = yColumns[0];
    const seriesMap = new Map<string, NivoLineSeries>();
    for (const row of rows) {
      const seriesKey = formatAxisValue(row[seriesColumn]);
      const y = coerceNumber(row[yColumn]);
      if (y === null) continue;
      if (!seriesMap.has(seriesKey)) seriesMap.set(seriesKey, { id: seriesKey, data: [] });
      seriesMap.get(seriesKey)!.data.push({ x: formatAxisValue(row[xColumn]), y });
    }
    return Array.from(seriesMap.values());
  }

  return yColumns.map(yColumn => ({
    id: yColumn,
    data: rows
      .map(row => ({ x: formatAxisValue(row[xColumn]), y: coerceNumber(row[yColumn]) }))
      .filter((point): point is { x: string; y: number } => point.y !== null),
  }));
}

export type NivoBarData = {
  data: Record<string, string | number>[];
  keys: string[];
  indexBy: string;
};

/**
 * Transform query rows into Nivo bar data.
 * - With seriesColumn: pivot distinct series values into keys, value = first yColumn.
 * - Without: keys = yColumns.
 */
export function buildBarData(rows: CustomQueryRow[], mapping: DashboardCardMapping): NivoBarData | null {
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
