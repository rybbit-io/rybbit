"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { availableComparisonModes, getAbsoluteBounds, resolveComparison } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { describeBounds, rangeFieldsForTime, timeFromRangeFields } from "./rangeFields";
import { Comparison, ComparisonMode, Time } from "./types";

type CustomFields = { startDate: string; endDate: string };

const customFieldsFor = (time: Time, zone: string): CustomFields => {
  const { startDate, endDate } = rangeFieldsForTime(time, zone);
  return { startDate, endDate };
};

const timeFromCustomFields = (fields: CustomFields, zone: string, maxDate: string): Time | null =>
  timeFromRangeFields({ ...fields, startTime: "", endTime: "" }, zone, maxDate);

/**
 * The panel's footer already said what the dashboard compares against; this
 * turns that sentence into the control that changes it. Nothing new appears in
 * the toolbar, and the choice sits next to the range it modifies.
 */
export function ComparisonSelect({
  time,
  comparison,
  zone,
  maxDate,
  onChange,
}: {
  /** The drafted period the comparison is resolved against. */
  time: Time;
  comparison: Comparison;
  zone: string;
  /** The dashboard's today — a comparison window cannot end after it. */
  maxDate: string;
  onChange: (comparison: Comparison) => void;
}) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);

  const resolved = resolveComparison(time, comparison, zone);

  // The custom window is held as fields rather than read back off the draft, so
  // a cleared date input does not snap back to the last value under the cursor.
  const [customFields, setCustomFields] = useState<CustomFields>(() =>
    customFieldsFor(comparison.customTime ?? resolved ?? time, zone)
  );

  const labels: Record<ComparisonMode, string> = {
    previous: t("Previous period"),
    weekday: t("Matching weekdays"),
    year: t("Same period last year"),
    custom: t("Custom range"),
    none: t("No comparison"),
  };

  // "Mar 8 – Mar 14" says nothing useful when the window is a year back, so the
  // year is named whenever it differs from the period being compared.
  const describe = (target: Time | null) => {
    const bounds = target && getAbsoluteBounds(target, zone);
    const label = describeBounds(bounds ?? null);
    const current = getAbsoluteBounds(time, zone);
    if (!bounds || !label || !current) return label;

    const year = bounds.end.minus({ minutes: 1 }).year;
    return year === current.end.minus({ minutes: 1 }).year ? label : `${label}, ${year}`;
  };

  const resolvedRange = describe(resolved);

  const selectMode = (mode: ComparisonMode) => {
    if (mode === "custom") {
      const seeded = comparison.customTime ? customFields : customFieldsFor(resolved ?? time, zone);
      setCustomFields(seeded);
      onChange({ mode, customTime: timeFromCustomFields(seeded, zone, maxDate) ?? undefined });
      return;
    }

    onChange({ mode });
    setOpen(false);
  };

  const editCustom = (key: keyof CustomFields, value: string) => {
    const next = { ...customFields, [key]: value };
    setCustomFields(next);

    // A half-edited window keeps the last usable one applied — the dashboard
    // should not blank its comparison line between two keystrokes.
    const parsed = timeFromCustomFields(next, zone, maxDate);
    if (parsed) onChange({ mode: "custom", customTime: parsed });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" className="text-neutral-500 dark:text-neutral-400">
          {resolvedRange ? t("Compares against {range}", { range: resolvedRange }) : t("No comparison period")}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[312px] p-1">
        {availableComparisonModes(time).map(mode => {
          const selected = comparison.mode === mode;
          const range = mode === "none" ? null : describe(resolveComparison(time, { ...comparison, mode }, zone));

          return (
            <div key={mode}>
              <button
                type="button"
                onClick={() => selectMode(mode)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800",
                  selected && "font-medium"
                )}
              >
                <span className="whitespace-nowrap">{labels[mode]}</span>
                <span className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                  {range}
                </span>
                <Check className={cn("h-3.5 w-3.5 shrink-0", !selected && "invisible")} />
              </button>

              {mode === "custom" && selected && (
                <div className="flex gap-1.5 px-2 pb-2 pt-1">
                  <Input
                    type="date"
                    inputSize="sm"
                    aria-label={t("Comparison start date")}
                    value={customFields.startDate}
                    max={maxDate}
                    onChange={event => editCustom("startDate", event.target.value)}
                    className="min-w-0 flex-1"
                  />
                  <Input
                    type="date"
                    inputSize="sm"
                    aria-label={t("Comparison end date")}
                    value={customFields.endDate}
                    max={maxDate}
                    onChange={event => editCustom("endDate", event.target.value)}
                    className="min-w-0 flex-1"
                  />
                </div>
              )}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
