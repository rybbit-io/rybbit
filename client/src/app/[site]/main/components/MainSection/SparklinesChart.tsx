"use client";
import { useNivoTheme } from "@/lib/nivo";
import { useTimezone } from "@/lib/store";
import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";

export function SparklinesChart({
  data,
  isHovering,
}: {
  data: { value: number; time: string }[] | undefined;
  isHovering: boolean;
}) {
  const nivoTheme = useNivoTheme();
  const timeZone = useTimezone();

  const formattedData = data
    ?.map(e => {
      // Buckets are wall-clock times in the dashboard's timezone, not the browser's.
      const time = DateTime.fromSQL(e.time, { zone: timeZone });

      // filter out dates from the future
      if (time > DateTime.now()) {
        return null;
      }

      return {
        x: time.toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
        y: e.value,
        currentTime: time,
      };
    })
    .filter(e => e !== null);

  return (
    <ResponsiveLine
      data={[
        {
          id: "1",
          data: formattedData ?? [],
        },
      ]}
      theme={nivoTheme}
      margin={{ top: 5, right: 0, bottom: 0, left: 0 }}
      xScale={{
        type: "time",
        format: "%Y-%m-%d %H:%M:%S",
        precision: "second",
        useUTC: true,
      }}
      yScale={{
        type: "linear",
        min: 0,
        stacked: false,
        reverse: false,
      }}
      enableGridX={false}
      enableGridY={false}
      gridYValues={4}
      yFormat=" >-.2f"
      axisTop={null}
      axisRight={null}
      axisBottom={null}
      axisLeft={null}
      enableTouchCrosshair={true}
      enablePoints={false}
      useMesh={true}
      animate={false}
      enableSlices={"x"}
      colors={[isHovering ? "hsl(var(--dataviz-2))" : "hsl(var(--dataviz))"]}
      enableArea={false}
      areaBaselineValue={0}
      areaOpacity={0.3}
      defs={[
        {
          id: "gradient",
          type: "linearGradient",
          colors: [
            { offset: 0, color: "hsl(var(--dataviz))", opacity: 1 },
            { offset: 100, color: "hsl(var(--dataviz))", opacity: 0 },
          ],
        },
      ]}
      curve="step"
      fill={[{ match: d => d.id === "1", id: "gradient" }]}
      sliceTooltip={() => null}
      enableCrosshair={false}
    />
  );
}
