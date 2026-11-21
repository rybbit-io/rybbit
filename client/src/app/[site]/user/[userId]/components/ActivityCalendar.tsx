"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { UserSessionCountResponse } from "../../../../../api/analytics/endpoints";
import { describeComparisonWindow } from "../../../../../components/DateSelector/rangeFields";
import { ErrorState } from "../../../../../components/ErrorState";
import { Card } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { useStore, useTimezone } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import {
  ActivityLevel,
  activityStats,
  buildCalendarWeeks,
  CALENDAR_WEEKS,
  CalendarDay,
  monthLabelColumns,
  rangeColumns,
} from "./calendarLayout";
import { profileWindow, singleDayLabel } from "./profileWindow";

// The data hue in three steps over a neutral empty day. Emerald stays out of
// it: on this page it means online, identified and converted.
const LEVEL_CLASS: Record<ActivityLevel, string> = {
  0: "bg-neutral-100 dark:bg-neutral-800",
  1: "bg-dataviz/30",
  2: "bg-dataviz/60",
  3: "bg-dataviz/95",
};

const CELL = "aspect-square w-full rounded-[3px]";
// Monday, Wednesday, Friday, Sunday.
const LABELLED_ROWS = [0, 2, 4, 6];

interface ActivityCalendarProps {
  /** One row per day with sessions, over the user's whole history. */
  sessionCount: UserSessionCountResponse[];
  isLoading: boolean;
  /** Set when the history could not be loaded. */
  error?: Error | null;
  refetch?: () => void;
  /** Active days in the selected period, from the stat band's query. */
  activeDays: number | undefined;
  /** ISO date of the day the session list is narrowed to, if any. */
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}

/**
 * The user's last eighteen weeks, a cell a day. Independent of the selected
 * period, which is marked underneath; picking a day narrows the session list
 * to it.
 */
export function ActivityCalendar({
  sessionCount,
  isLoading,
  error,
  refetch,
  activeDays,
  selectedDay,
  onSelectDay,
}: ActivityCalendarProps) {
  const t = useExtracted();
  const zone = useTimezone();
  const time = useStore(state => state.time);
  const { formatDateTime } = useDateTimeFormat();

  const counts = sessionCount.map(row => ({ date: String(row.date).slice(0, 10), sessions: Number(row.sessions) }));
  const today = DateTime.now().setZone(zone);
  const weeks = buildCalendarWeeks(counts, today, CALENDAR_WEEKS);
  const months = monthLabelColumns(weeks);

  const window = profileWindow(time, zone, today);
  const marked = window ? rangeColumns(weeks, window.start, window.end) : null;
  const windowLabel = singleDayLabel(describeComparisonWindow(time, time, zone));
  const stats = activityStats(counts, window?.start ?? null, window?.end ?? null);

  // Calendar days are dates, not instants: format them at noon in the zone so
  // no offset can push the label onto a neighbouring day.
  const dayAt = (isoDate: string) => DateTime.fromISO(`${isoDate}T12:00:00`, { zone });
  const formatDay = (isoDate: string) =>
    formatDateTime(dayAt(isoDate), { weekday: "short", month: "short", day: "numeric", timeZone: zone });
  const weekdayName = (weekday: number, width: "short" | "long") =>
    // 2024-01-01 was a Monday.
    formatDateTime(DateTime.fromISO("2024-01-01T12:00:00", { zone }).plus({ days: weekday - 1 }), {
      weekday: width,
      timeZone: zone,
    });

  const describeDay = (day: CalendarDay) =>
    day.sessions > 0
      ? t("{count, plural, one {# session} other {# sessions}}", { count: day.sessions })
      : day.beforeFirstVisit
        ? t("Before first visit")
        : t("No sessions");

  // An empty grid would say "never visited"; a failed request must not.
  if (error) {
    return (
      <Card>
        <div className="p-4">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t("Activity")}</h2>
          <ErrorState title={t("Failed to load data")} message={error.message} refetch={refetch} />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t("Activity")}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px] border border-neutral-200 dark:border-neutral-700" />
              {t("Before first visit")}
            </span>
            <span className="inline-flex items-center gap-1">
              {t("Less")}
              {([0, 1, 2, 3] as ActivityLevel[]).map(level => (
                <span key={level} className={cn("inline-block h-2.5 w-2.5 rounded-[2px]", LEVEL_CLASS[level])} />
              ))}
              {t("More")}
            </span>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="mt-3 h-[178px] w-full max-w-[430px] rounded-md" />
        ) : (
          <div
            className="mt-3 grid w-full max-w-[430px] gap-[3px]"
            style={{ gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1fr))` }}
          >
            {months.map(({ month, column }) => (
              <span
                key={month}
                className="h-[18px] whitespace-nowrap text-[11px] text-neutral-500 dark:text-neutral-400"
                // Room for the name, without spanning past the last week into implicit columns.
                style={{ gridRow: 1, gridColumn: `${column + 2} / span ${Math.min(3, weeks.length - column)}` }}
              >
                {formatDateTime(dayAt(`${month}-01`), { month: "short", timeZone: zone })}
              </span>
            ))}

            {LABELLED_ROWS.map(row => (
              <span
                key={row}
                className="flex items-center pr-1.5 text-[10px] leading-none text-neutral-500 dark:text-neutral-400"
                style={{ gridRow: row + 2, gridColumn: 1 }}
              >
                {weekdayName(row + 1, "short")}
              </span>
            ))}

            {weeks.flatMap((week, column) =>
              week.days.map((day, row) => {
                if (!day) return null;
                const position = { gridRow: row + 2, gridColumn: column + 2 };
                const selected = day.date === selectedDay;
                const label = `${describeDay(day)} · ${formatDay(day.date)}`;

                return (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      {day.sessions > 0 ? (
                        <button
                          type="button"
                          style={position}
                          aria-label={label}
                          aria-pressed={selected}
                          onClick={() => onSelectDay(selected ? null : day.date)}
                          className={cn(
                            CELL,
                            LEVEL_CLASS[day.level],
                            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500",
                            selected &&
                              "ring-2 ring-neutral-900 ring-offset-1 ring-offset-white dark:ring-neutral-100 dark:ring-offset-neutral-900"
                          )}
                        />
                      ) : (
                        <span
                          style={position}
                          className={cn(
                            CELL,
                            day.beforeFirstVisit ? "border border-neutral-200 dark:border-neutral-850" : LEVEL_CLASS[0]
                          )}
                        />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="font-medium tabular-nums">{describeDay(day)}</span>{" "}
                      <span className="opacity-70">· {formatDay(day.date)}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}

            {marked && windowLabel && (
              <div
                className="relative mt-1 h-5 border-t border-neutral-300 dark:border-neutral-600"
                style={{ gridRow: 9, gridColumn: `${marked.from + 2} / ${marked.to + 3}` }}
              >
                <span
                  className={cn(
                    "absolute top-1 whitespace-nowrap text-[11px] leading-none text-neutral-500 dark:text-neutral-400",
                    // A narrow mark near the right edge would push its label out of the card.
                    marked.from > weeks.length / 2 ? "right-0" : "left-0"
                  )}
                >
                  {windowLabel}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-850">
          <CalendarFact
            value={activeDays != null ? activeDays.toLocaleString() : null}
            label={window ? t("active days in range") : t("active days")}
          />
          <CalendarFact
            value={isLoading ? null : t("{count, plural, one {# day} other {# days}}", { count: stats.longestStreak })}
            label={t("longest streak")}
          />
          <CalendarFact
            value={isLoading ? null : stats.busiestWeekday ? weekdayName(stats.busiestWeekday, "long") : "—"}
            label={t("busiest day")}
          />
        </div>
      </div>
    </Card>
  );
}

function CalendarFact({ value, label }: { value: string | null; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {value === null ? (
        <Skeleton className="h-3 w-8 rounded" />
      ) : (
        <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{value}</span>
      )}
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
  );
}
