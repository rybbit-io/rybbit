import * as React from "react";
import { Label, Textarea } from "@rybbit/ui";

/** Labelled multi-line field, 60px min height, resizes vertically by default. */
export function Default() {
  return (
    <div className="grid w-[420px] gap-1.5 p-4">
      <Label htmlFor="note">Annotation note</Label>
      <Textarea
        id="note"
        placeholder="What changed on this date?"
        defaultValue="Shipped the new pricing page and started the Product Hunt launch."
      />
    </div>
  );
}

/** Empty with placeholder, a taller `rows` variant, and disabled. */
export function States() {
  return (
    <div className="grid w-[420px] gap-3 p-4">
      <Textarea placeholder="Describe this segment…" />
      <Textarea rows={5} defaultValue={"path contains /docs\nAND country is Germany\nAND browser is Firefox"} className="font-mono text-xs" />
      <Textarea disabled defaultValue="Managed by your organization admin." />
    </div>
  );
}

/** Invalid state: `aria-invalid` for a11y plus `dark:border-red-400` (Textarea has no built-in invalid style and its `dark:border-neutral-800` beats a bare `border-red-400`), with a character count below. */
export function WithCount() {
  return (
    <div className="grid w-[420px] gap-1.5 p-4">
      <Label htmlFor="desc">Site description</Label>
      <Textarea id="desc" aria-invalid="true" className="dark:border-red-400" defaultValue="Tomato.gg is a World of Tanks statistics site with live player lookups, tank rankings, and a very long description that runs past the limit." />
      <div className="flex justify-between text-xs">
        <span className="text-red-400">Keep it under 120 characters</span>
        <span className="text-neutral-400 tabular-nums">142 / 120</span>
      </div>
    </div>
  );
}
