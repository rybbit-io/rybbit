import * as React from "react";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from "@rybbit/ui";

/** Canonical: a date-range popover anchored to its trigger, rendered open (align="start"). */
export function DateRange() {
  const presets = ["Today", "Last 7 days", "Last 30 days", "This month"];
  return (
    <div className="min-h-screen p-4">
      <Popover open>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <CalendarIcon />
            Last 7 days
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64" onOpenAutoFocus={e => e.preventDefault()}>
          <div className="grid gap-1">
            {presets.map(p => (
              <button
                key={p}
                type="button"
                className={
                  "rounded-md px-2 py-1.5 text-left text-sm " +
                  (p === "Last 7 days" ? "bg-neutral-700 text-neutral-50" : "text-neutral-300 hover:bg-neutral-700/60")
                }
              >
                {p}
              </button>
            ))}
          </div>
          <Separator className="my-3 dark:bg-neutral-700" />
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label htmlFor="from" className="text-xs text-neutral-400">
                From
              </Label>
              <Input id="from" defaultValue="2026-09-06" className="h-8 text-xs" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="to" className="text-xs text-neutral-400">
                To
              </Label>
              <Input id="to" defaultValue="2026-09-13" className="h-8 text-xs" />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Small filter form with checkboxes and a footer action. */
export function FilterForm() {
  const options = [
    { label: "Chrome", count: "6,240", checked: true },
    { label: "Safari", count: "2,118", checked: true },
    { label: "Firefox", count: "914", checked: false },
    { label: "Edge", count: "402", checked: false },
  ];
  return (
    <div className="min-h-screen p-4">
      <Popover open>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter />
            Browser
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <p className="mb-2 text-xs font-medium text-neutral-400">Browser is</p>
          <div className="grid gap-2">
            {options.map(o => (
              <label key={o.label} className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked={o.checked} />
                <span className="flex-1">{o.label}</span>
                <span className="text-xs text-neutral-400">{o.count}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm">
              Clear
            </Button>
            <Button variant="accent" size="sm">
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Plain informational popover (text only, default w-72) anchored to a ghost button. */
export function InfoText() {
  return (
    <div className="min-h-screen p-4">
      <Popover open>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            What counts as a bounce?
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <p className="text-sm font-medium">Bounce rate</p>
          <p className="mt-1 text-sm text-neutral-400">
            The share of sessions with a single pageview and no custom events. Rybbit counts a session as bounced
            after 30 minutes of inactivity.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
