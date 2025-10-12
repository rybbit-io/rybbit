import { ResponsiveBar } from "@nivo/bar";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { useGetOverviewBucketed } from "../../../../api/analytics/useGetOverviewBucketed";
import { nivoTheme } from "../../../../lib/nivo";
import { useStore } from "../../../../lib/store";

export function RealtimeChart() {
  const { site } = useStore();

  // Create a time object for the last 30 minutes for realtime data
  const realtimeTime = {
    mode: "past-minutes" as const,
    pastMinutesStart: 30,
    pastMinutesEnd: 0,
  };

  const { data, isLoading } = useGetOverviewBucketed({
    site,
    bucket: "minute",
    overrideTime: realtimeTime,
    refetchInterval: 10000,
  });

  const chartData = useMemo(() => {
    if (!data?.data || data.data.length === 0) {
      return [];
    }

    return data.data.map(point => ({
      time: DateTime.fromSQL(point.time).toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
      users: point.users,
    }));
  }, [data]);

  if (isLoading) {
    return null;
  }

  if (!chartData || chartData.length === 0) {
    return null;
  }

  return (
    <ResponsiveBar
      data={chartData}
      keys={["users"]}
      indexBy="time"
      margin={{ top: 0, right: 0, bottom: 12, left: 0 }}
      padding={0.3}
      valueScale={{ type: "linear" }}
      indexScale={{ type: "band", round: true }}
      colors={["hsl(var(--amber-200))"]}
      theme={nivoTheme}
      axisTop={null}
      axisRight={null}
      axisBottom={null}
      axisLeft={null}
      enableLabel={false}
      enableGridX={false}
      enableGridY={false}
      tooltip={({ id, value, data }: { id: string | number; value: number; data: { time: string; users: number } }) => {
        const currentTime = DateTime.fromFormat(data.time, "yyyy-MM-dd HH:mm:ss", { zone: "utc" }).toLocal();
        const currentY = Number(value);

        return (
          <div className="bg-neutral-950 p-2 rounded-md text-xs">
            <div className="font-semibold mb-1">
              {currentTime.isValid ? currentTime.toFormat("h:mm") : "Invalid Time"}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">{currentY.toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">{id}</span>
            </div>
          </div>
        );
      }}
      animate={true}
      motionConfig="gentle"
      borderRadius={2}
    />
  );
}
