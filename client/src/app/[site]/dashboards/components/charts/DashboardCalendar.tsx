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
import { ChartEmpty } from "./shared";

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

  if (!calendar) return <ChartEmpty />;

  return (
    <ResponsiveTimeRange
      data={calendar.data}
      theme={nivoTheme}
      from={calendar.from}
      to={calendar.to}
      emptyColor={isDark ? "hsl(var(--neutral-750))" : "hsl(var(--neutral-100))"}
      colors={
        isDark
          ? ["#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa"]
          : ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"]
      }
      margin={{ top: 20, right: 8, bottom: 8, left: 8 }}
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
  );
}
