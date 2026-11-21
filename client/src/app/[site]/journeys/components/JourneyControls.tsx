"use client";

import { ListFilter, Minus, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode, useState } from "react";
import { ControlButton } from "@/components/site/ControlButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatter } from "@/lib/utils";

export interface ControlOption<T extends string> {
  value: T;
  label: string;
}

/** A "Label value ▾" control that picks one of a few options. */
export function OptionControl<T extends string>({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon?: ReactNode;
  label: string;
  value: T;
  options: ControlOption<T>[];
  onChange: (value: T) => void;
}) {
  const selected = options.find(option => option.value === value);

  // Radix hands back a plain string; looking the option up returns it as T.
  const select = (next: string) => {
    const option = options.find(candidate => candidate.value === next);
    if (option) onChange(option.value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ControlButton icon={icon} label={label} value={selected?.label ?? value} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={select}>
          {options.map(option => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** How many steps deep the paths go: one click, one step, one request. */
export function StepsStepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  const t = useExtracted();
  const button =
    "flex h-full w-7 items-center justify-center text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-40 dark:text-neutral-300 dark:hover:bg-neutral-850 dark:focus-visible:ring-neutral-300";

  return (
    <div
      role="group"
      aria-label={t("Steps")}
      className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-neutral-100 text-xs dark:border-neutral-700"
    >
      <span className="pl-2.5 pr-2 text-neutral-500 dark:text-neutral-400">{t("Steps")}</span>
      <button
        type="button"
        aria-label={t("Fewer steps")}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(button, "border-l border-neutral-100 dark:border-neutral-700")}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        aria-live="polite"
        className="w-6 text-center font-medium tabular-nums text-neutral-900 dark:text-neutral-100"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={t("More steps")}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={button}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export interface PageSuggestion {
  value: string;
  count?: number;
}

const MAX_SUGGESTIONS = 50;
const PICKER_ITEM =
  "flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-xs hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none dark:hover:bg-neutral-700 dark:focus-visible:bg-neutral-700";

/**
 * The body of a page picker: type a page or a pattern, or pick one of the
 * site's pages. Nothing is applied until a choice is made, so typing does not
 * refetch on every keystroke.
 */
function PagePickerPanel({
  value,
  suggestions,
  onPick,
}: {
  value: string;
  suggestions: PageSuggestion[];
  onPick: (value: string) => void;
}) {
  const t = useExtracted();
  const [draft, setDraft] = useState(value);
  const query = draft.trim();
  const lower = query.toLowerCase();
  const matches = suggestions
    .filter(suggestion => suggestion.value.toLowerCase().includes(lower))
    .slice(0, MAX_SUGGESTIONS);
  const isListed = suggestions.some(suggestion => suggestion.value === query);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={event => {
        event.preventDefault();
        onPick(query);
      }}
    >
      <Input
        autoFocus
        inputSize="sm"
        value={draft}
        onChange={event => setDraft(event.target.value)}
        placeholder={t("Page or pattern, e.g. /docs/**")}
        aria-label={t("Page or pattern")}
      />
      <div className="-mx-1 max-h-56 overflow-y-auto">
        {query && !isListed && (
          <button type="submit" className={PICKER_ITEM}>
            <span className="truncate">{t('Use "{pattern}"', { pattern: query })}</span>
          </button>
        )}
        {matches.map(suggestion => (
          <button
            key={suggestion.value}
            type="button"
            onClick={() => onPick(suggestion.value)}
            className={cn(PICKER_ITEM, suggestion.value === value && "bg-neutral-100 dark:bg-neutral-700")}
          >
            <span className="truncate">{suggestion.value}</span>
            {suggestion.count !== undefined && (
              <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                {formatter(suggestion.count)}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-2 dark:border-neutral-700">
        <span className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
          {t("* matches one path segment, ** matches several")}
        </span>
        {value && (
          <Button type="button" variant="ghost" size="xs" onClick={() => onPick("")}>
            {t("Clear")}
          </Button>
        )}
      </div>
    </form>
  );
}

interface PagePickerProps {
  /** The applied page or pattern; empty for any page. */
  value: string;
  onChange: (value: string) => void;
  suggestions: PageSuggestion[];
}

/** A "Label page ▾" control: where the paths start, or where they end. */
export function PagePicker({
  icon,
  label,
  value,
  onChange,
  suggestions,
}: PagePickerProps & { icon?: ReactNode; label: string }) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ControlButton icon={icon} label={label} value={value || t("Any page")} className="max-w-[260px]" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <PagePickerPanel
          value={value}
          suggestions={suggestions}
          onPick={next => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** The filter button in a step's column header: the same picker, for that one step. */
export function StepFilterButton({ step, value, onChange, suggestions }: PagePickerProps & { step: number }) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const label = t("Filter step {number} by page", { number: String(step) });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            aria-label={label}
            title={label}
            className="max-w-[140px] gap-1 font-normal"
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span className="truncate">{value}</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-label={label}
            title={label}
            className="h-5 w-5 px-0 text-neutral-500 dark:text-neutral-400"
          >
            <ListFilter className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <PagePickerPanel
          value={value}
          suggestions={suggestions}
          onPick={next => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
