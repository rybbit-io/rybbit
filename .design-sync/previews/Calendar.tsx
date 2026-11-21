import * as React from "react";
import { Calendar } from "@rybbit/ui";

// Fixed month so the render is deterministic (the capture clock is pinned to 2024-05-15, which is "today").
const may2024 = new Date(2024, 4, 1);

/** Canonical single-date picker: one selected day (light pill), today outlined in the neutral ramp. */
export function SingleDate() {
  const [date, setDate] = React.useState<Date | undefined>(new Date(2024, 4, 8));
  return (
    <div className="p-4">
      <Calendar mode="single" selected={date} onSelect={setDate} defaultMonth={may2024} />
    </div>
  );
}

/** Range mode: start/end get the solid pill, the days between get the neutral-700 band. */
export function DateRange() {
  const [range, setRange] = React.useState<{ from?: Date; to?: Date } | undefined>({
    from: new Date(2024, 4, 6),
    to: new Date(2024, 4, 19),
  });
  return (
    <div className="p-4">
      <Calendar mode="range" selected={range} onSelect={setRange} defaultMonth={may2024} />
    </div>
  );
}

/** Future days disabled (the common "up to today" analytics picker) plus month/year dropdown caption. */
export function DisabledFutureDropdown() {
  const [date, setDate] = React.useState<Date | undefined>(new Date(2024, 4, 15));
  return (
    <div className="p-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        defaultMonth={may2024}
        disabled={{ after: new Date(2024, 4, 15) }}
        captionLayout="dropdown"
        startMonth={new Date(2023, 0, 1)}
        endMonth={new Date(2024, 11, 1)}
      />
    </div>
  );
}
