import { ResponsiveTimeRange } from "@nivo/calendar";
import _ from "lodash";
import { DateTime } from "luxon";
import { useTheme } from "next-themes";
import { UserSessionCountResponse } from "../../../../../api/analytics/endpoints";
import { useNivoTheme } from "../../../../../lib/nivo";
import { ChartTooltip } from "../../../../../components/charts/ChartTooltip";

export const VisitCalendar = ({ sessionCount }: { sessionCount: UserSessionCountResponse[] }) => {
  const { resolvedTheme } = useTheme();
  const nivoTheme = useNivoTheme();
  const data = sessionCount
    .map(e => ({
      value: e.sessions,
      day: DateTime.fromSQL(e.date ?? 0, { zone: "utc" })
        .toLocal()
        .toFormat("y-LL-dd"),
    }))
    .reverse();

  const maxValue = _.get(_.sortBy(data, "value")[Math.floor(data.length * 0.95)], "value");

  if (data.length === 0) {
    return null;
  }

  const toDate = DateTime.now().toFormat("y-LL-dd");
  const fromDate = DateTime.now().minus({ days: 120 }).toFormat("y-LL-dd");

  return (
    <ResponsiveTimeRange
      data={data}
      theme={nivoTheme}
      from={fromDate}
      to={toDate}
      emptyColor={resolvedTheme === "dark" ? "hsl(var(--neutral-750))" : "hsl(var(--neutral-100))"}
      colors={
        resolvedTheme === "dark"
          ? ["#10452A", "#006D32", "#3E9058", "#3CD456"]
          : ["#9be9a8", "#40c463", "#30a14e", "#216e39"]
      }
      margin={{ top: 20, right: 0, bottom: 0, left: 0 }}
      dayBorderWidth={2}
      daySpacing={3}
      dayBorderColor="rgba(0, 0, 0, 0)"
      dayRadius={3}
      weekdayTicks={[]}
      weekdayLegendOffset={0}
      maxValue={maxValue}
      tooltip={({ value, day }) => {
        return (
          <ChartTooltip className="p-2 flex gap-1">
            {value}
            <span className="text-neutral-600 dark:text-neutral-300">session{Number(value) > 1 && "s"} on</span> {day}
          </ChartTooltip>
        );
      }}
    />
  );
};
