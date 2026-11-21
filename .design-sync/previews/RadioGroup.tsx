import * as React from "react";
import { Label, RadioGroup, RadioGroupItem } from "@rybbit/ui";

/** Canonical vertical group with one selected item (emerald ring, white dot). */
export function Default() {
  return (
    <div className="w-[420px] p-4">
      <p className="mb-3 text-sm font-medium">Data retention</p>
      <RadioGroup defaultValue="365">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="90" id="r-90" />
          <Label htmlFor="r-90" className="font-normal">90 days</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="365" id="r-365" />
          <Label htmlFor="r-365" className="font-normal">1 year</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="forever" id="r-forever" />
          <Label htmlFor="r-forever" className="font-normal">Forever</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

/** Horizontal layout via `className="flex gap-4"` on the group, for short enum choices. */
export function Horizontal() {
  return (
    <div className="w-[420px] p-4">
      <p className="mb-3 text-sm font-medium">Chart interval</p>
      <RadioGroup defaultValue="day" className="flex gap-4">
        {["hour", "day", "week", "month"].map(v => (
          <div key={v} className="flex items-center gap-2">
            <RadioGroupItem value={v} id={`int-${v}`} />
            <Label htmlFor={`int-${v}`} className="font-normal capitalize">{v}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

/** Items with a description line and one disabled option. */
export function WithDescriptions() {
  return (
    <div className="w-[420px] p-4">
      <RadioGroup defaultValue="all">
        <div className="flex items-start gap-3">
          <RadioGroupItem value="all" id="v-all" className="mt-0.5" />
          <div className="grid gap-1">
            <Label htmlFor="v-all">All visitors</Label>
            <p className="text-xs text-neutral-400">Count every session, including returning visitors.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <RadioGroupItem value="new" id="v-new" className="mt-0.5" />
          <div className="grid gap-1">
            <Label htmlFor="v-new">New visitors only</Label>
            <p className="text-xs text-neutral-400">First session in the selected range.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <RadioGroupItem value="identified" id="v-id" disabled className="mt-0.5" />
          <div className="grid gap-1">
            <Label htmlFor="v-id" className="opacity-70">Identified users</Label>
            <p className="text-xs text-neutral-400">Requires `identify()` calls from your app.</p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
