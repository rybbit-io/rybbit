"use client";

import { ResponsiveTimeRange } from "@nivo/calendar";
import type { DashboardCardMapping } from "@rybbit/shared";
import sortBy from "lodash/sortBy";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import type { CustomQueryRow } from "@/api/analytics/endpoints";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useNivoTheme } from "@/lib/nivo";
import { buildCalendarData, formatValue } from "../../utils";
import { ChartEmpty, dataVizSequential } from "./shared";

type DashboardCalendarProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

export function DashboardCalendar({ rows, mapping }: DashboardCalendarProps) {
  const { resolvedTheme } = useTheme();
  const nivoTheme = useNivoTheme();
  const isDark = resolvedTheme === "dark";
  const format = mapping.valueFormat ?? "number";

  const calendar = useMemo(() => buildCalendarData(rows, mapping), [rows, mapping]);

  // 95th-percentile cap keeps a single spike from washing out the scale.
  const maxValue = useMemo(() => {
    if (!calendar || calendar.data.length === 0) return undefined;
    const sorted = sortBy(calendar.data, "value");
    return sorted[Math.floor(sorted.length * 0.95)]?.value;
  }, [calendar]);

  if (!calendar) {
    const dateColumn = mapping.dateColumn ?? mapping.xColumn;
    return (
      <ChartEmpty
        message={
          dateColumn
            ? `Couldn't read dates in "${dateColumn}". Expect YYYY-MM-DD values.`
            : "Select a date column (YYYY-MM-DD)."
        }
      />
    );
  }

  // ResponsiveTimeRange measures its parent; in a flex/grid card a bare
  // height:100% can collapse to 0 (rendering nothing). An absolutely-filled box
  // gives it a concrete size regardless of the surrounding flex context.
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <ResponsiveTimeRange
          data={calendar.data}
          theme={nivoTheme}
          from={calendar.from}
          to={calendar.to}
          emptyColor={isDark ? "hsl(var(--neutral-750))" : "hsl(var(--neutral-100))"}
          colors={dataVizSequential(isDark)}
          margin={{ top: 20, right: 0, bottom: 0, left: 0 }}
          dayBorderWidth={2}
          daySpacing={3}
          dayBorderColor="rgba(0, 0, 0, 0)"
          dayRadius={3}
          weekdayTicks={[]}
          weekdayLegendOffset={0}
          maxValue={maxValue}
          tooltip={({ value, day }) => (
            <ChartTooltip className="flex gap-1 p-2 text-xs">
              {day}: {formatValue(Number(value), format)}
            </ChartTooltip>
          )}
        />
      </div>
    </div>
  );
}
