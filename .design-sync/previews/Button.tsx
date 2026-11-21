import * as React from "react";
import { Button } from "@rybbit/ui";
import { Download, Plus, RefreshCw, Settings, Trash2 } from "lucide-react";

/** The variant axis. `accent` is the emerald primary action; `default` is the raised gray chrome button. */
export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="accent">Add site</Button>
      <Button variant="default">Export CSV</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">View docs</Button>
      <Button variant="success">Enable tracking</Button>
      <Button variant="warning">Pause site</Button>
      <Button variant="destructive">Delete site</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="lg" variant="accent">Large</Button>
      <Button variant="accent">Default</Button>
      <Button size="sm" variant="accent">Small</Button>
      <Button size="xs" variant="accent">Extra small</Button>
      <Button size="icon" variant="default" aria-label="Settings"><Settings /></Button>
      <Button size="smIcon" variant="outline" aria-label="Refresh"><RefreshCw /></Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="accent"><Plus /> New goal</Button>
      <Button variant="default"><Download /> Download report</Button>
      <Button variant="destructive"><Trash2 /> Remove</Button>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="accent" disabled>Saving…</Button>
      <Button variant="default" disabled>Disabled</Button>
      <Button variant="outline" disabled>Disabled outline</Button>
    </div>
  );
}

/** A real footer row: secondary on the left, the single accent action on the right. */
export function ActionRow() {
  return (
    <div className="flex w-full max-w-md items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <Button variant="ghost" size="sm">Cancel</Button>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">Save draft</Button>
        <Button variant="accent" size="sm">Publish</Button>
      </div>
    </div>
  );
}
