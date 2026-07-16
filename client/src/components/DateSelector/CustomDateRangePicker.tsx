"use client";

import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { Time } from "./types";

const toLocalISODate = (d: Date) => DateTime.fromJSDate(d).toFormat("yyyy-MM-dd");
const fromISODate = (s: string) => (s ? DateTime.fromISO(s).toJSDate() : undefined);

const timeToDateRange = (time: Time): DateRange | undefined => {
  if (time.mode === "range") {
    return { from: fromISODate(time.startDate), to: fromISODate(time.endDate) };
  }
  if (time.mode === "day") {
    return { from: fromISODate(time.day), to: undefined };
  }
  return undefined;
};

export function CustomDateRangePicker({ className, setTime, time }: { className?: string; setTime: (time: Time) => void; time: Time }) {
  const t = useExtracted();
  const selected = timeToDateRange(time);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button id="date" variant={"ghost"} className={cn("justify-start text-left font-normal px-2", !time.wellKnown && "bg-neutral-100 dark:bg-neutral-800 font-medium")}>
            {t("Custom Range")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={range => {
              if (!range?.from) return;
              if (range.to) {
                setTime({
                  mode: "range",
                  startDate: toLocalISODate(range.from),
                  endDate: toLocalISODate(range.to),
                });
              } else {
                setTime({
                  mode: "day",
                  day: toLocalISODate(range.from),
                });
              }
            }}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
