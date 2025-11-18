import { ResponsiveCalendar } from "@nivo/calendar";
import _ from "lodash";
import { DateTime } from "luxon";
import { useTheme } from "next-themes";
import { UserSessionCountResponse } from "../../../../../api/analytics/useGetUserSessions";
import { useNivoTheme } from "../../../../../lib/nivo";

export const VisitCalendar = ({ sessionCount }: { sessionCount: UserSessionCountResponse[] }) => {
  const { resolvedTheme } = useTheme();
  const nivoTheme = useNivoTheme();
  const data = sessionCount
    .map(e => ({
      value: e.sessions,
      day: DateTime.fromSQL(e.date ?? 0)
        .toLocal()
        .toFormat("y-LL-dd"),
    }))
    .reverse();

  const maxValue = _.get(_.sortBy(data, "value")[Math.floor(data.length * 0.95)], "value");

  if (data.length === 0) {
    return null;
  }

  const numYears = DateTime.fromISO(data[0].day ?? "").year - DateTime.fromISO(data.at(-1)?.day ?? "").year + 1;

  return (
    <div style={{ width: "100%", overflowX: "auto", height: "150px" }}>
      <div style={{ minWidth: "600px", height: "100%" }}>
        <ResponsiveCalendar
          data={data}
          theme={nivoTheme}
          from={data.at(-1)?.day ?? ""}
          to={data[0]?.day}
          emptyColor={resolvedTheme === "dark" ? "hsl(var(--neutral-750))" : "hsl(var(--neutral-100))"}
          colors={["#10452A", "#006D32", "#3E9058", "#3CD456"]}
          margin={{ top: 20, right: 0, bottom: 1, left: 20 }}
          monthBorderColor="rgba(0, 0, 0, 0)"
          daySpacing={3}
          dayBorderColor="rgba(0, 0, 0, 0)"
          maxValue={maxValue}
          tooltip={({ value, day }) => {
            return (
              <div className="bg-neutral-150 dark:bg-neutral-900 p-2 rounded-md border border-neutral-300 dark:border-neutral-800 text-sm">
                {value} <span className="text-neutral-600 dark:text-neutral-300">session{Number(value) > 1 && "s"} on</span> {day}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};
