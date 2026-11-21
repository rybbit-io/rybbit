"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input, type InputProps } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Date and time fields that never open the browser's own picker, which in dark
 * mode is a grey panel that looks nothing like the app.
 *
 * `DatePicker` / `DateTimePicker` are an Input-styled button that opens
 * ui/calendar in a popover. Values cross as the strings the native inputs used
 * (`yyyy-MM-dd`, `yyyy-MM-ddTHH:mm`, "" for empty), so callers keep their parsing.
 *
 * `DateInput` / `TimeInput` are the native fields, still typeable segment by
 * segment, with the indicator that opens the native popup hidden and the
 * segments drawn in the current theme. For places that need typing, or that
 * already show a calendar beside the field.
 */

const THEMED_SEGMENTS = "[color-scheme:light] dark:[color-scheme:dark]";
const NATIVE_FIELD = cn(THEMED_SEGMENTS, "[&::-webkit-calendar-picker-indicator]:hidden");

type NativeFieldProps = Omit<InputProps, "type" | "isSearch">;

const DateInput = React.forwardRef<HTMLInputElement, NativeFieldProps>(({ className, ...props }, ref) => (
  <Input ref={ref} type="date" className={cn(NATIVE_FIELD, className)} {...props} />
));
DateInput.displayName = "DateInput";

const TimeInput = React.forwardRef<HTMLInputElement, NativeFieldProps>(({ className, ...props }, ref) => (
  <Input ref={ref} type="time" className={cn(NATIVE_FIELD, className)} {...props} />
));
TimeInput.displayName = "TimeInput";

// ui/input's field, on a button. ui/popover lifts its inputs' borders off its
// own fill; this is a button, so it opts into that by hand.
const TRIGGER =
  "flex w-full min-w-0 items-center gap-2 rounded-lg border border-neutral-150 bg-transparent text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-500 dark:border-neutral-800 dark:focus-visible:ring-neutral-300 dark:aria-[invalid=true]:border-red-400 dark:[[data-slot=popover-content]_&]:border-neutral-700";
const TRIGGER_SIZES = {
  default: "h-9 px-3 text-sm",
  sm: "h-8 px-2.5 text-xs",
} as const;

// react-day-picker works in whole days in the browser's zone, so days cross
// as `yyyy-MM-dd`, never as an instant (as in DateSelector/RangePanel).
const toCalendarDate = (iso: string) => {
  const date = DateTime.fromISO(iso);
  return date.isValid ? date.startOf("day").toJSDate() : undefined;
};
const fromCalendarDate = (date: Date) => DateTime.fromJSDate(date).toISODate() ?? "";

// The value is a wall clock, not an instant. Reading it in UTC prints it as
// written, where the browser's own zone would move a time its DST gap skips.
const formatValue = (value: string, format: Intl.DateTimeFormatOptions) => {
  const parsed = DateTime.fromISO(value, { zone: "utc" });
  return parsed.isValid ? parsed.toLocaleString(format) : value;
};

type TriggerProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "defaultValue" | "onChange" | "type" | "children"
>;

type PickerProps = TriggerProps & {
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable day, `yyyy-MM-dd`. */
  min?: string;
  /** Latest selectable day, `yyyy-MM-dd`. */
  max?: string;
  size?: "default" | "sm";
  placeholder?: string;
  /** Offers Clear, for fields where empty means something (no expiry). */
  clearable?: boolean;
  /** Set inside a Dialog, like the other popovers there. */
  modal?: boolean;
  align?: "start" | "center" | "end";
};

type PickerFieldProps = TriggerProps & {
  display: string;
  placeholder: string;
  size: "default" | "sm";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
  align?: "start" | "center" | "end";
  panel: React.ReactNode;
};

const PickerField = React.forwardRef<HTMLButtonElement, PickerFieldProps>(
  (
    {
      display,
      placeholder,
      size,
      open,
      onOpenChange,
      modal,
      align = "start",
      panel,
      className,
      "aria-describedby": describedBy,
      ...props
    },
    ref
  ) => {
    const valueId = React.useId();

    return (
      <Popover open={open} onOpenChange={onOpenChange} modal={modal}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            // A label or aria-label names the field; the value is its
            // description, so it is still announced alongside that name.
            aria-describedby={[display ? valueId : null, describedBy].filter(Boolean).join(" ") || undefined}
            className={cn(TRIGGER, TRIGGER_SIZES[size], className)}
            {...props}
          >
            <span
              id={valueId}
              className={cn("min-w-0 flex-1 truncate", !display && "text-neutral-500 dark:text-neutral-400")}
            >
              {display || placeholder}
            </span>
            <CalendarIcon
              aria-hidden
              className={cn("shrink-0 opacity-50", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto p-0">
          {panel}
        </PopoverContent>
      </Popover>
    );
  }
);
PickerField.displayName = "PickerField";

function DayCalendar({
  date,
  min,
  max,
  onPick,
}: {
  date: string;
  min?: string;
  max?: string;
  onPick: (date: string) => void;
}) {
  const selected = toCalendarDate(date);
  const minDate = min ? toCalendarDate(min) : undefined;
  const maxDate = max ? toCalendarDate(max) : undefined;
  const disabled: Matcher[] = [];
  if (minDate) disabled.push({ before: minDate });
  if (maxDate) disabled.push({ after: maxDate });

  // The year dropdown needs bounds; without min/max, a decade either side.
  const today = DateTime.now().startOf("day");
  const anchor = selected ? DateTime.fromJSDate(selected) : today;

  return (
    <Calendar
      mode="single"
      // Passing `onSelect` keeps `selected` controlled. The clicked day is used
      // rather than the proposed selection, so re-picking the selected day
      // keeps it instead of clearing it. Disabled days never reach this.
      selected={selected}
      onSelect={(_selection, day) => onPick(fromCalendarDate(day))}
      defaultMonth={selected ?? (maxDate && maxDate < today.toJSDate() ? maxDate : undefined)}
      startMonth={minDate ?? (anchor < today ? anchor : today).minus({ years: 10 }).toJSDate()}
      endMonth={maxDate ?? (anchor > today ? anchor : today).plus({ years: 10 }).toJSDate()}
      captionLayout="dropdown"
      weekStartsOn={1}
      disabled={disabled}
      initialFocus
      // the month/year dropdowns are native selects
      className={THEMED_SEGMENTS}
    />
  );
}

const PANEL_ROW = "flex items-center gap-2 border-t border-neutral-150 px-3 py-2 dark:border-neutral-750";

const DatePicker = React.forwardRef<HTMLButtonElement, PickerProps>(
  ({ value, onChange, min, max, size = "default", placeholder, clearable, ...props }, ref) => {
    const t = useExtracted();
    const [open, setOpen] = React.useState(false);

    const pick = (next: string) => {
      onChange(next);
      setOpen(false);
    };

    return (
      <PickerField
        ref={ref}
        {...props}
        size={size}
        open={open}
        onOpenChange={setOpen}
        display={value ? formatValue(value, DateTime.DATE_MED) : ""}
        placeholder={placeholder ?? t("Pick a date")}
        panel={
          <>
            <DayCalendar date={value} min={min} max={max} onPick={pick} />
            {clearable && value && (
              <div className={cn(PANEL_ROW, "justify-end")}>
                <Button type="button" variant="ghost" size="xs" onClick={() => pick("")}>
                  {t("Clear")}
                </Button>
              </div>
            )}
          </>
        }
      />
    );
  }
);
DatePicker.displayName = "DatePicker";

const DateTimePicker = React.forwardRef<HTMLButtonElement, PickerProps>(
  ({ value, onChange, min, max, size = "default", placeholder, clearable, ...props }, ref) => {
    const t = useExtracted();
    const [open, setOpen] = React.useState(false);
    const timeId = React.useId();

    const [datePart = "", timePart = ""] = value ? value.split("T") : [];

    // Picking a day keeps the time (midnight for a fresh value) and leaves the
    // popover open, since the time is usually the next thing to set.
    const pickDate = (date: string) => onChange(`${date}T${timePart || "00:00"}`);
    // A half-typed time reads as "": the last whole value stays until it completes.
    const pickTime = (time: string) => {
      if (time) onChange(`${datePart || DateTime.now().toISODate()}T${time}`);
    };

    return (
      <PickerField
        ref={ref}
        {...props}
        size={size}
        open={open}
        onOpenChange={setOpen}
        display={value ? formatValue(value, DateTime.DATETIME_MED) : ""}
        placeholder={placeholder ?? t("Pick a date and time")}
        panel={
          <>
            <DayCalendar date={datePart} min={min} max={max} onPick={pickDate} />
            <div className={PANEL_ROW}>
              <label htmlFor={timeId} className="text-xs text-neutral-500 dark:text-neutral-400">
                {t("Time")}
              </label>
              <TimeInput
                id={timeId}
                inputSize="sm"
                value={timePart}
                onChange={event => pickTime(event.target.value)}
                className="w-28"
              />
              {clearable && value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="ml-auto"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  {t("Clear")}
                </Button>
              )}
            </div>
          </>
        }
      />
    );
  }
);
DateTimePicker.displayName = "DateTimePicker";

export { DateInput, DatePicker, DateTimePicker, TimeInput };
export type { PickerProps as DatePickerProps };
