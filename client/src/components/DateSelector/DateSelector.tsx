"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "lucide-react";
import { DateTime } from "luxon";
import { CustomDateRangePicker } from "./CustomDateRangePicker";
import { Time } from "./types";

const getLabel = (time: Time) => {
  if (time.mode === "range") {
    if (time.wellKnown) {
      return `${time.wellKnown}`;
    }
    const startFormatted = DateTime.fromISO(time.startDate).toFormat("EEEE, MMM d");
    const endFormatted = DateTime.fromISO(time.endDate).toFormat("EEEE, MMM d");
    return `${startFormatted} - ${endFormatted}`;
  }

  if (time.mode === "past-minutes") {
    if (time.pastMinutesStart >= 60) {
      const hours = Math.floor(time.pastMinutesStart / 60);
      return `Last ${hours} ${hours === 1 ? "Hour" : "Hours"}`;
    }
    return `Last ${time.pastMinutesStart} minutes`;
  }

  if (time.mode === "day") {
    if (time.day === DateTime.now().toISODate()) {
      return "Today";
    }
    if (time.day === DateTime.now().minus({ days: 1 }).toISODate()) {
      return "Yesterday";
    }
    return DateTime.fromISO(time.day).toFormat("EEEE, MMM d");
  }
  if (time.mode === "week") {
    if (time.week === DateTime.now().startOf("week").toISODate()) {
      return "This Week";
    }
    if (time.week === DateTime.now().minus({ weeks: 1 }).startOf("week").toISODate()) {
      return "Last Week";
    }
    const startDate = DateTime.fromISO(time.week).toFormat("EEEE, MMM d");
    const endDate = DateTime.fromISO(time.week).endOf("week").toFormat("EEEE, MMM d");
    return `${startDate} - ${endDate}`;
  }
  if (time.mode === "month") {
    if (time.month === DateTime.now().startOf("month").toISODate()) {
      return "This Month";
    }
    if (time.month === DateTime.now().minus({ months: 1 }).startOf("month").toISODate()) {
      return "Last Month";
    }
    return DateTime.fromISO(time.month).toFormat("MMMM yyyy");
  }
  if (time.mode === "year") {
    if (time.year === DateTime.now().startOf("year").toISODate()) {
      return "This Year";
    }
    return DateTime.fromISO(time.year).toFormat("yyyy");
  }
  if (time.mode === "all-time") {
    return "All Time";
  }
};

export function DateSelector({
  time,
  setTime,
  pastMinutesEnabled = true,
}: {
  time: Time;
  setTime: (time: Time) => void;
  pastMinutesEnabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-xs sm:text-sm p-2 sm:p-3 h-8 sm:h-9" variant={"default"}>
        <Calendar className="hidden sm:block w-4 h-4" />
        {getLabel(time)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "day",
              day: DateTime.now().toISODate(),
            })
          }
        >
          Today
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "range",
              startDate: DateTime.now().minus({ days: 2 }).toISODate(),
              endDate: DateTime.now().toISODate(),
              wellKnown: "Last 3 days",
            })
          }
        >
          Last 3 Days
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "range",
              startDate: DateTime.now().minus({ days: 6 }).toISODate(),
              endDate: DateTime.now().toISODate(),
              wellKnown: "Last 7 days",
            })
          }
        >
          Last 7 Days
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "range",
              startDate: DateTime.now().minus({ days: 13 }).toISODate(),
              endDate: DateTime.now().toISODate(),
              wellKnown: "Last 14 days",
            })
          }
        >
          Last 14 Days
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "range",
              startDate: DateTime.now().minus({ days: 29 }).toISODate(),
              endDate: DateTime.now().toISODate(),
              wellKnown: "Last 30 days",
            })
          }
        >
          Last 30 Days
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "range",
              startDate: DateTime.now().minus({ days: 59 }).toISODate(),
              endDate: DateTime.now().toISODate(),
              wellKnown: "Last 60 days",
            })
          }
        >
          Last 60 Days
        </DropdownMenuItem>
        {pastMinutesEnabled && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                setTime({
                  mode: "past-minutes",
                  pastMinutesStart: 30,
                  pastMinutesEnd: 0,
                })
              }
            >
              Last 30 Minutes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setTime({
                  mode: "past-minutes",
                  pastMinutesStart: 60,
                  pastMinutesEnd: 0,
                })
              }
            >
              Last 1 Hour
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setTime({
                  mode: "past-minutes",
                  pastMinutesStart: 360,
                  pastMinutesEnd: 0,
                })
              }
            >
              Last 6 Hours
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setTime({
                  mode: "past-minutes",
                  pastMinutesStart: 1440,
                  pastMinutesEnd: 0,
                })
              }
            >
              Last 24 Hours
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "week",
              week: DateTime.now().startOf("week").toISODate(),
            })
          }
        >
          This Week
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "month",
              month: DateTime.now().startOf("month").toISODate(),
            })
          }
        >
          This Month
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "year",
              year: DateTime.now().startOf("year").toISODate(),
            })
          }
        >
          This Year
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTime({
              mode: "all-time",
            })
          }
        >
          All Time
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <CustomDateRangePicker setTime={setTime} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
