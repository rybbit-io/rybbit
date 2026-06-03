"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import { ResponsiveBar } from "@nivo/bar";
import { useMemo } from "react";
import type { CustomQueryRow } from "../../../../../api/analytics/endpoints";
import { useStore } from "../../../../../lib/store";
import { useNivoTheme } from "../../../../../lib/nivo";
import { formatter } from "../../../../../lib/utils";
import { buildBarData, buildChartAxis, CARD_PALETTE } from "../../utils";

type DashboardBarChartProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

export function DashboardBarChart({ rows, mapping }: DashboardBarChartProps) {
  const theme = useNivoTheme();
  const bucket = useStore(state => state.bucket);
  const bar = useMemo(() => buildBarData(rows, mapping), [rows, mapping]);
  const axis = useMemo(
    () => buildChartAxis(bar ? bar.data.map(entry => String(entry[bar.indexBy])) : [], bucket),
    [bar, bucket]
  );

  if (!bar || bar.data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-neutral-500">
        Configure chart columns to render this card
      </div>
    );
  }

  return (
    <ResponsiveBar
      data={bar.data}
      keys={bar.keys}
      indexBy={bar.indexBy}
      theme={theme}
      colors={CARD_PALETTE}
      margin={{ top: 12, right: 16, bottom: 48, left: 52 }}
      padding={0.3}
      groupMode="grouped"
      enableLabel={false}
      axisBottom={{
        tickRotation: axis.isTime ? 0 : -25,
        tickSize: 4,
        tickPadding: 6,
        tickValues: axis.tickValues,
        format: axis.format,
      }}
      axisLeft={{ tickSize: 4, tickPadding: 6, format: value => formatter(Number(value)) }}
      enableGridX={false}
      legends={
        bar.keys.length > 1
          ? [
              {
                dataFrom: "keys",
                anchor: "bottom",
                direction: "row",
                translateY: 44,
                itemWidth: 90,
                itemHeight: 16,
                symbolSize: 10,
                itemTextColor: "hsl(var(--neutral-400))",
              },
            ]
          : []
      }
    />
  );
}
