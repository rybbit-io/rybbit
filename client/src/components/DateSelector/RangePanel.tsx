"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import useMediaQuery from "@/components/ui/hooks/useMediaQuery";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { timezones } from "@/lib/dateTimeUtils";
import { getDashboardTimeForRange, type DashboardDefaultTimeRange } from "@/lib/defaultTimeRange";
import { deriveTimeState, getAbsoluteBounds } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon";
import { Check, Globe } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { PRESET_GROUPS, usePresetGroupLabels, usePresetLabels } from "./presets";
import {
  describeBounds,
  rangeFieldsForTime,
  timeFromRangeFields,
  timeFromSelectedDays,
  type RangeFields,
} from "./rangeFields";
import { Time } from "./types";

/**
 * react-day-picker works in whole calendar days in the browser's zone, so days
 * cross that boundary as `yyyy-MM-dd` and never as an instant. The dashboard
 * timezone is applied where it actually matters — deciding which day is
 * "today", and turning a bound into an instant.
 */
const toCalendarDate = (iso: string) => DateTime.fromISO(iso).startOf("day").toJSDate();
const fromCalendarDate = (date: Date) => DateTime.fromJSDate(date).toISODate() ?? "";

export function RangePanel({
  time,
  zone,
  timezone,
  setTimezone,
  pastMinutesEnabled,
  onApply,
  onCancel,
}: {
  time: Time;
  /** The resolved IANA zone — never the "system" sentinel. */
  zone: string;
  /** The stored preference, which may be "system". */
  timezone: string;
  setTimezone: (timezone: string) => void;
  pastMinutesEnabled: boolean;
  onApply: (time: Time) => void;
  onCancel: () => void;
}) {
  const t = useExtracted();
  const presetLabels = usePresetLabels();
  const groupLabels = usePresetGroupLabels();
  const isWide = useMediaQuery("(min-width: 768px)");
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  // "Today" is the dashboard's today, not the browser's — the picker used to
  // disable future days against the machine clock, which is off by one for
  // anyone whose machine and dashboard disagree.
  const todayHere = DateTime.now().setZone(zone).toISODate() ?? "";

  /**
   * The draft. Nothing here reaches the dashboard until Apply, so a two-click
   * range no longer navigates — and refires every query — between its clicks.
   *
   * `pending` holds the first of those two clicks together with the window that
   * was showing when the sequence began, because the two clicks arrive as two
   * renders and the first one collapses the selection to a single day. Reading
   * the clocks back off `base` rather than off that collapsed day is what keeps
   * an overnight range (17:00 → 09:00) from losing its times on the way through.
   *
   * `invalid` means the fields no longer describe a usable window. The last good
   * draft stays put so the calendar keeps rendering, but Apply is refused —
   * otherwise a typo would quietly re-commit the previous range as if the edit
   * had been accepted.
   */
  const [draft, setDraft] = useState<{
    time: Time;
    fields: RangeFields;
    pending?: { anchor: string; base: Time };
    invalid?: boolean;
  }>(() => ({ time, fields: rangeFieldsForTime(time, zone) }));

  const setDraftTime = (next: Time) => setDraft({ time: next, fields: rangeFieldsForTime(next, zone) });

  const editField = (key: keyof RangeFields, value: string) =>
    setDraft(prev => {
      const fields = { ...prev.fields, [key]: value };
      const parsed = timeFromRangeFields(fields, zone, todayHere);
      return { time: parsed ?? prev.time, fields, invalid: parsed === null };
    });

  const pickDay = (clicked: string) =>
    setDraft(prev => {
      if (!prev.pending) {
        const next = timeFromSelectedDays(clicked, clicked, prev.time, zone);
        return {
          time: next,
          fields: rangeFieldsForTime(next, zone),
          pending: { anchor: clicked, base: prev.time },
        };
      }
      const { anchor, base } = prev.pending;
      const [from, to] = anchor <= clicked ? [anchor, clicked] : [clicked, anchor];
      const next = timeFromSelectedDays(from, to, base, zone);
      return { time: next, fields: rangeFieldsForTime(next, zone) };
    });

  const groups = PRESET_GROUPS.filter(group => pastMinutesEnabled || group.id !== "realtime");

  const bounds = getAbsoluteBounds(draft.time, zone);
  const selected: DateRange | undefined = bounds
    ? {
        from: toCalendarDate(bounds.start.toISODate() ?? ""),
        to: toCalendarDate(bounds.end.minus({ minutes: 1 }).toISODate() ?? ""),
      }
    : undefined;

  const maxDate = toCalendarDate(todayHere);
  const months = isWide === false ? 1 : 2;
  const lastMonth = DateTime.fromISO(todayHere).startOf("month");

  const { previousTime } = deriveTimeState(draft.time, zone);
  const comparison = describeBounds(getAbsoluteBounds(previousTime, zone));

  const applyPreset = (preset: DashboardDefaultTimeRange) => onApply(getDashboardTimeForRange(preset, zone));

  return (
    <div className="flex flex-col">
      <div className="flex flex-col md:flex-row">
        <div className="w-full border-b border-neutral-150 md:w-[190px] md:shrink-0 md:border-b-0 md:border-r dark:border-neutral-800">
          <Command defaultValue={draft.time.wellKnown ? presetLabels[draft.time.wellKnown] : undefined}>
            <CommandInput placeholder={t("Search ranges")} />
            {/* Capped so the rail ends level with the calendar column beside it
                (two months + the bound rows + the pane's padding, less this
                list's own 36px search row). Left to its natural height the
                seventeen presets stretched the panel and left a block of dead
                space under the calendar. */}
            <CommandList className="max-h-[180px] md:max-h-[384px]">
              <CommandEmpty>{t("No matching range")}</CommandEmpty>
              {groups.map(group => (
                <CommandGroup key={group.id} heading={groupLabels[group.id]}>
                  {group.presets.map(preset => (
                    <CommandItem
                      key={preset}
                      value={presetLabels[preset]}
                      onSelect={() => applyPreset(preset)}
                      className={cn(draft.time.wellKnown === preset && "font-medium")}
                    >
                      {presetLabels[preset]}
                      {draft.time.wellKnown === preset && <Check className="ml-auto h-3.5 w-3.5" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>

        <div className="flex flex-col p-3">
          <Calendar
            // `useMediaQuery` resolves in an effect, so `months` flips from 2 to
            // 1 after mount. `defaultMonth` is only read on mount, which left a
            // phone opening one month to the left of the selection — remount so
            // it is read again once the breakpoint is known.
            key={months}
            mode="range"
            selected={selected}
            onDayClick={(date, modifiers) => {
              if (modifiers.disabled) return;
              pickDay(fromCalendarDate(date));
            }}
            defaultMonth={(selected?.to ? DateTime.fromJSDate(selected.to).startOf("month") : lastMonth)
              .minus({ months: months - 1 })
              .toJSDate()}
            numberOfMonths={months}
            weekStartsOn={1}
            captionLayout="dropdown"
            startMonth={lastMonth.minus({ years: 6 }).toJSDate()}
            endMonth={lastMonth.toJSDate()}
            disabled={{ after: maxDate }}
            // the calendar is `w-fit`; centre it when it is alone in a full-width column
            className="mx-auto p-0 md:mx-0"
          />

          <div className="mt-3 hidden flex-col gap-2 border-t border-neutral-150 pt-3 md:flex dark:border-neutral-800">
            <BoundRow
              label={t("From")}
              date={draft.fields.startDate}
              time={draft.fields.startTime}
              max={todayHere}
              onDate={value => editField("startDate", value)}
              onTime={value => editField("startTime", value)}
              dateLabel={t("Start date")}
              timeLabel={t("Start time")}
            />
            <BoundRow
              label={t("To")}
              date={draft.fields.endDate}
              time={draft.fields.endTime}
              max={todayHere}
              onDate={value => editField("endDate", value)}
              onTime={value => editField("endTime", value)}
              dateLabel={t("End date")}
              timeLabel={t("End time")}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-150 px-3 py-2 dark:border-neutral-800">
        <span
          className={cn(
            "mr-auto text-xs text-neutral-500 dark:text-neutral-400",
            draft.invalid && "text-red-500 dark:text-red-400"
          )}
        >
          {draft.invalid
            ? t("Enter a date range that ends after it starts, on or before today")
            : comparison
              ? t("Compares against {range}", { range: comparison })
              : t("No comparison period")}
        </span>

        <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="xs" className="text-neutral-500 dark:text-neutral-400">
              <Globe className="h-3 w-3" />
              {timezones.find(option => option.value === timezone)?.label ?? timezone}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px] p-0">
            <Command>
              <CommandInput placeholder={t("Search timezones")} />
              <CommandList>
                <CommandEmpty>{t("No matching timezone")}</CommandEmpty>
                <CommandGroup>
                  {timezones.map(option => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        setTimezone(option.value);
                        setTimezoneOpen(false);
                      }}
                      className={cn(timezone === option.value && "font-medium")}
                    >
                      {option.label}
                      {timezone === option.value && <Check className="ml-auto h-3.5 w-3.5" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button variant="accent" size="sm" disabled={draft.invalid} onClick={() => onApply(draft.time)}>
          {t("Apply")}
        </Button>
      </div>
    </div>
  );
}

function BoundRow({
  label,
  date,
  time,
  max,
  onDate,
  onTime,
  dateLabel,
  timeLabel,
}: {
  label: string;
  date: string;
  time: string;
  max: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  dateLabel: string;
  timeLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <Input
        type="date"
        inputSize="sm"
        aria-label={dateLabel}
        value={date}
        max={max}
        onChange={event => onDate(event.target.value)}
        className="min-w-0 flex-1"
      />
      <Input
        type="time"
        inputSize="sm"
        aria-label={timeLabel}
        value={time}
        onChange={event => onTime(event.target.value)}
        className="w-[104px] shrink-0"
      />
    </div>
  );
}
