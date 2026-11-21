"use client";

import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import { FormEvent, useId, useState } from "react";
import { ControlButton } from "@/components/site/ControlButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { cn } from "@/lib/utils";
import { describeRange, hasRange, RangeValue, toRange } from "../sessionRanges";

interface RangeChipProps {
  /** What is being ranged: "Pageviews", "Events", "Duration". */
  label: string;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  /** Accessible name of the clear button, e.g. "Clear duration range". */
  clearLabel: string;
  /** Bounds are seconds and read as durations ("10s or longer"). */
  duration?: boolean;
}

function RangeForm({
  value,
  duration,
  onApply,
}: Pick<RangeChipProps, "value" | "duration"> & { onApply: (value: RangeValue) => void }) {
  const t = useExtracted();
  const id = useId();
  const [min, setMin] = useState(value.min?.toString() ?? "");
  const [max, setMax] = useState(value.max?.toString() ?? "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(toRange(min, max));
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-min`} className="text-xs text-neutral-600 dark:text-neutral-300">
            {duration ? t("At least (seconds)") : t("At least")}
          </Label>
          <Input
            id={`${id}-min`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder="0"
            value={min}
            onChange={event => setMin(event.target.value)}
            className="h-8 tabular-nums"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-max`} className="text-xs text-neutral-600 dark:text-neutral-300">
            {duration ? t("At most (seconds)") : t("At most")}
          </Label>
          <Input
            id={`${id}-max`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder={t("Any")}
            value={max}
            onChange={event => setMax(event.target.value)}
            className="h-8 tabular-nums"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onApply({})} disabled={!hasRange(value)}>
          {t("Clear")}
        </Button>
        <Button type="submit" variant="accent" size="sm">
          {t("Apply")}
        </Button>
      </div>
    </form>
  );
}

/**
 * A min/max range as one analysis-bar control. At rest it reads "Pageviews
 * Any"; with a bound set it reads as the filter it is ("Duration 10s or
 * longer") and carries its own clear button.
 */
export function RangeChip({ label, value, onChange, clearLabel, duration = false }: RangeChipProps) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const applied = hasRange(value);

  const show = (bound: number) => (duration ? formatShortDuration(bound) : bound.toLocaleString());
  const description = describeRange(value);
  const text =
    description.kind === "any"
      ? t("Any")
      : description.kind === "exact"
        ? t("exactly {value}", { value: show(description.value) })
        : description.kind === "between"
          ? t("{min} to {max}", { min: show(description.min), max: show(description.max) })
          : description.kind === "min"
            ? duration
              ? t("{value} or longer", { value: show(description.min) })
              : t("{value} or more", { value: show(description.min) })
            : t("up to {value}", { value: show(description.max) });

  return (
    <div className="flex max-w-full items-stretch">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <ControlButton
            label={label}
            value={<span className="tabular-nums">{text}</span>}
            className={cn(
              applied && "rounded-r-none border-neutral-150 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-850"
            )}
          />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          {/* Mounted with the popover, so the inputs start from the applied range each time it opens. */}
          <RangeForm
            value={value}
            duration={duration}
            onApply={next => {
              onChange(next);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {applied && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={clearLabel}
          onClick={() => onChange({})}
          className="-ml-px rounded-l-none border-neutral-150 bg-neutral-50 px-1.5 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-850 dark:text-neutral-400 [&_svg]:size-3.5"
        >
          <X strokeWidth={2.5} />
        </Button>
      )}
    </div>
  );
}
