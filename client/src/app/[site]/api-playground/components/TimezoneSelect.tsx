"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { commonTimezones, usePlaygroundStore } from "../hooks/usePlaygroundStore";

export function TimezoneSelect() {
  const { timeZone, setTimeZone } = usePlaygroundStore();

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Time Zone</label>
      <Select value={timeZone} onValueChange={setTimeZone}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {commonTimezones.map(tz => (
            <SelectItem key={tz.value} value={tz.value} className="text-xs">
              {tz.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
