import * as React from "react";
import { Checkbox, Label } from "@rybbit/ui";

/** The three static states: unchecked, checked (emerald fill, white check), and disabled. */
export function States() {
  return (
    <div className="grid w-[420px] gap-3 p-4">
      <div className="flex items-center gap-2">
        <Checkbox id="unchecked" />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="checked" defaultChecked />
        <Label htmlFor="checked">Checked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="disabled" disabled />
        <Label htmlFor="disabled" className="opacity-70">Disabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked" className="opacity-70">Disabled, checked</Label>
      </div>
    </div>
  );
}

/** A column-picker list, the typical multi-select use in report settings. */
export function ColumnPicker() {
  const columns = [
    { id: "visitors", label: "Visitors", on: true },
    { id: "pageviews", label: "Pageviews", on: true },
    { id: "bounce", label: "Bounce rate", on: true },
    { id: "duration", label: "Session duration", on: false },
    { id: "conversions", label: "Goal conversions", on: false },
  ];
  return (
    <div className="w-[420px] p-4">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <p className="mb-3 text-sm font-medium">Columns in weekly report</p>
        <div className="grid gap-2.5">
          {columns.map(c => (
            <div key={c.id} className="flex items-center gap-2">
              <Checkbox id={c.id} defaultChecked={c.on} />
              <Label htmlFor={c.id} className="font-normal">{c.label}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Checkbox with a description line, for consequential settings. */
export function WithDescription() {
  return (
    <div className="w-[420px] p-4">
      <div className="flex items-start gap-3">
        <Checkbox id="salt" defaultChecked className="mt-0.5" />
        <div className="grid gap-1">
          <Label htmlFor="salt">Salt user IDs daily</Label>
          <p className="text-xs text-neutral-400">
            Visitors get a new anonymous ID every day. Returning-visitor stats reset at midnight UTC.
          </p>
        </div>
      </div>
    </div>
  );
}
