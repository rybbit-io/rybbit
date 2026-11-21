import * as React from "react";
import { Checkbox, Input, Label, Switch } from "@rybbit/ui";

/** Label above an Input via `htmlFor`: 14px medium, tight leading. */
export function WithInput() {
  return (
    <div className="grid w-[420px] gap-1.5 p-4">
      <Label htmlFor="site-name">Site name</Label>
      <Input id="site-name" defaultValue="rybbit.com" />
      <p className="text-xs text-neutral-400">Shown in the site switcher and weekly report emails.</p>
    </div>
  );
}

/** Inline label to the right of a Checkbox / Switch; clicking the text toggles the control. */
export function WithToggles() {
  return (
    <div className="grid w-[420px] gap-4 p-4">
      <div className="flex items-center gap-2">
        <Checkbox id="exclude-bots" defaultChecked />
        <Label htmlFor="exclude-bots">Exclude known bots</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="public" />
        <Label htmlFor="public">Public dashboard</Label>
      </div>
    </div>
  );
}

/** Label paired with a disabled `peer` control fades to 70% (peer-disabled). */
export function Disabled() {
  return (
    <div className="grid w-[420px] gap-1.5 p-4">
      <div className="flex items-center gap-2">
        <Switch id="replay" disabled className="peer" />
        <Label htmlFor="replay">Session replay (requires Pro)</Label>
      </div>
    </div>
  );
}

/** Label with a required marker and a trailing hint, a common settings-form row. */
export function WithHint() {
  return (
    <div className="grid w-[420px] gap-1.5 p-4">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="api-key">
          API key <span className="text-red-400">*</span>
        </Label>
        <span className="text-xs text-neutral-400">Kept secret</span>
      </div>
      <Input id="api-key" type="password" defaultValue="rb_live_9f2c1d8ab4" />
    </div>
  );
}
