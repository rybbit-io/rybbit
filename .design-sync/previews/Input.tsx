import * as React from "react";
import { Input, Label } from "@rybbit/ui";

/** The canonical labelled field: 36px tall, transparent fill, hairline neutral-800 border. */
export function Default() {
  return (
    <div className="grid w-[420px] gap-1.5 p-4">
      <Label htmlFor="domain">Domain</Label>
      <Input id="domain" placeholder="example.com" defaultValue="tomato.gg" />
    </div>
  );
}

/** The `inputSize` axis: default (36px, 14px text) and sm (28px, 12px text) for dense toolbars. */
export function Sizes() {
  return (
    <div className="grid w-[420px] gap-3 p-4">
      <Input placeholder="Site name (default)" />
      <Input inputSize="sm" placeholder="Site name (sm)" />
    </div>
  );
}

/** `isSearch` adds the leading lucide Search icon and pads the text past it. Used for every filter box. */
export function SearchField() {
  return (
    <div className="grid w-[420px] gap-3 p-4">
      <Input isSearch placeholder="Search pages…" />
      <Input isSearch inputSize="sm" placeholder="Filter countries" defaultValue="Ger" />
    </div>
  );
}

/** Static states: placeholder, filled, disabled, and `aria-invalid` (red border) with a help line. */
export function States() {
  return (
    <div className="grid w-[420px] gap-3 p-4">
      <Input placeholder="Placeholder only" />
      <Input defaultValue="https://rybbit.com" />
      <Input disabled defaultValue="site_1f9c2a (read only)" />
      <div className="grid gap-1.5">
        <Input aria-invalid="true" defaultValue="not a domain" />
        <p className="text-xs text-red-400">Enter a valid domain, like tomato.gg</p>
      </div>
    </div>
  );
}

/** Two fields on one row plus a number input, the way a goal/threshold form lays out. */
export function FormRow() {
  return (
    <div className="grid w-[420px] gap-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="goal-name">Goal name</Label>
          <Input id="goal-name" defaultValue="Signup completed" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="goal-path">Path</Label>
          <Input id="goal-path" placeholder="/signup/done" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="threshold">Alert when visitors exceed</Label>
        <Input id="threshold" type="number" defaultValue={500} className="w-32 tabular-nums" />
      </div>
    </div>
  );
}
