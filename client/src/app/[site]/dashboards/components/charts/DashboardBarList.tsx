"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import { useMemo } from "react";
import type { CustomQueryRow } from "@/api/analytics/endpoints";
import { coerceNumber, firstNumericColumn, formatAxisValue, formatValue } from "../../utils";
import { ChartEmpty } from "./shared";

type DashboardBarListProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

type BarRow = { label: string; value: number };

/** Horizontal "top N" list: one proportional bar per category, value right-aligned. */
export function DashboardBarList({ rows, mapping }: DashboardBarListProps) {
  const { bars, max } = useMemo(() => {
    const labelColumn = mapping.xColumn;
    const valueColumn = mapping.valueColumn ?? mapping.yColumns?.[0] ?? firstNumericColumn(rows);
    if (!labelColumn || !valueColumn) return { bars: [] as BarRow[], max: 1 };

    const bars = rows
      .map(row => ({ label: formatAxisValue(row[labelColumn]), value: coerceNumber(row[valueColumn]) ?? 0 }))
      .sort((a, b) => b.value - a.value);
    const max = bars.reduce((acc, bar) => Math.max(acc, bar.value), 0) || 1;
    return { bars, max };
  }, [rows, mapping]);

  const format = mapping.valueFormat ?? "number";
  const fill = "hsl(var(--dataviz))";

  if (bars.length === 0) {
    return <ChartEmpty message={mapping.xColumn ? "No rows to rank." : "Select a category and a value column."} />;
  }

  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto px-1 py-0.5">
      {bars.map((bar, index) => (
        <div
          key={`${bar.label}-${index}`}
          className="relative flex h-7 shrink-0 items-center justify-between overflow-hidden rounded px-2"
        >
          <div
            className="absolute inset-y-0 left-0 rounded"
            style={{ width: `${Math.max(2, (bar.value / max) * 100)}%`, backgroundColor: fill, opacity: 0.18 }}
          />
          <span className="relative z-10 truncate pr-3 text-xs text-neutral-700 dark:text-neutral-200">
            {bar.label || "—"}
          </span>
          <span className="relative z-10 shrink-0 text-xs font-medium tabular-nums text-neutral-600 dark:text-neutral-300">
            {formatValue(bar.value, format)}
          </span>
        </div>
      ))}
    </div>
  );
}
