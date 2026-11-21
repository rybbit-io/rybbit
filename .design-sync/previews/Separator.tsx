import * as React from "react";
import { Button, Separator } from "@rybbit/ui";
import { Download, Filter, RefreshCw } from "lucide-react";

/** Horizontal: a 1px neutral-800 hairline between two text blocks. */
export function Horizontal() {
  return (
    <div className="w-full max-w-md p-4">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">Tracking script</div>
        <div className="text-sm text-muted-foreground">Paste this snippet before the closing head tag on tomato.gg.</div>
      </div>
      <Separator className="my-4" />
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">Data retention</div>
        <div className="text-sm text-muted-foreground">Events are kept for 24 months on the Pro plan.</div>
      </div>
    </div>
  );
}

/** Vertical: give it a height (or let a fixed-height flex row stretch it) to divide toolbar groups. */
export function VerticalToolbar() {
  return (
    <div className="p-4">
      <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2">
        <Button variant="ghost" size="sm"><Filter /> Filter</Button>
        <Separator orientation="vertical" className="h-5" />
        <Button variant="ghost" size="sm"><RefreshCw /> Refresh</Button>
        <Separator orientation="vertical" className="h-5" />
        <Button variant="ghost" size="sm"><Download /> Export</Button>
      </div>
    </div>
  );
}

/** Inline metadata separated by short vertical rules. */
export function InlineMeta() {
  return (
    <div className="p-4">
      <div className="flex h-4 items-center gap-3 text-sm text-muted-foreground">
        <span>tomato.gg</span>
        <Separator orientation="vertical" />
        <span>Last 7 days</span>
        <Separator orientation="vertical" />
        <span className="tabular-nums">2.4M events</span>
      </div>
    </div>
  );
}
