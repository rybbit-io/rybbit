"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import { ResponsiveLine } from "@nivo/line";
import { useMemo } from "react";
import type { CustomQueryRow } from "../../../../../api/analytics/endpoints";
import { useStore } from "../../../../../lib/store";
import { useNivoTheme } from "../../../../../lib/nivo";
import { formatter } from "../../../../../lib/utils";
import { buildChartAxis, buildLineSeries, CARD_PALETTE, getXValues } from "../../utils";

type DashboardLineChartProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
};

export function DashboardLineChart({ rows, mapping }: DashboardLineChartProps) {
  const theme = useNivoTheme();
  const bucket = useStore(state => state.bucket);
  const series = useMemo(() => buildLineSeries(rows, mapping), [rows, mapping]);
  const axis = useMemo(
    () => buildChartAxis(getXValues(rows, mapping.xColumn), bucket),
    [rows, mapping.xColumn, bucket]
  );

  if (series.length === 0 || series.every(s => s.data.length === 0)) {
    return <ChartEmpty />;
  }

  return (
    <ResponsiveLine
      data={series}
      theme={theme}
      colors={CARD_PALETTE}
      margin={{ top: 12, right: 16, bottom: 48, left: 52 }}
      xScale={{ type: "point" }}
      yScale={{ type: "linear", min: 0, max: "auto", stacked: false }}
      axisBottom={{
        tickRotation: axis.isTime ? 0 : -25,
        tickSize: 4,
        tickPadding: 6,
        tickValues: axis.tickValues,
        format: axis.format,
      }}
      axisLeft={{ tickSize: 4, tickPadding: 6, format: value => formatter(Number(value)) }}
      enablePoints={series[0]?.data.length <= 30}
      pointSize={5}
      enableGridX={false}
      curve="monotoneX"
      useMesh
      enableSlices="x"
      legends={
        series.length > 1
          ? [
              {
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

function ChartEmpty() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-neutral-500">
      Configure chart columns to render this card
    </div>
  );
}
