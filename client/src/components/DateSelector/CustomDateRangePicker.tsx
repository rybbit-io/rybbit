"use client";

import * as React from "react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";
import { Time } from "./types";

export function CustomDateRangePicker({ className, setTime, time }: { className?: string; setTime: (time: Time) => void; time: Time }) {
  const [date, setDate] = React.useState<DateRange | undefined>();
  const t = useExtracted();

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
            defaultMonth={date?.from}
            selected={date}
            onSelect={range => {
              setDate(range);
              if (!range) return;
              if (range?.to) {
                setTime({
                  mode: "range",
                  startDate: range?.from?.toISOString().split("T")[0] ?? "",
                  endDate: range?.to?.toISOString().split("T")[0] ?? "",
                });
              } else {
                setTime({
                  mode: "day",
                  day: range?.from?.toISOString().split("T")[0] ?? "",
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
