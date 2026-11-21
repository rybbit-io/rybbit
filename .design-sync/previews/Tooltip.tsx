import * as React from "react";
import { Info, Settings } from "lucide-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@rybbit/ui";

/** Canonical: an icon button with a short label tooltip (side="top" is the default). Rendered open. */
export function IconLabel() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Site settings">
            <Settings />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Site settings</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** The four `side` placements, each open at once (top/bottom on one row, left/right on the next). */
export function Placements() {
  const Pair = ({ sides }: { sides: readonly ("top" | "right" | "bottom" | "left")[] }) => (
    <div className="flex items-center justify-center gap-10">
      {sides.map(side => (
        <Tooltip key={side} open>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              {side}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-4">
      <Pair sides={["top", "bottom"]} />
      <Pair sides={["left", "right"]} />
    </div>
  );
}

/** Multi-line explanatory content on an inline info icon (side="right", aligned to start). */
export function MetricExplainer() {
  return (
    <div className="flex min-h-screen items-center p-4 pl-8">
      <span className="flex items-center gap-1.5 text-sm text-neutral-400">
        Bounce rate
        <Tooltip open>
          <TooltipTrigger asChild>
            <button type="button" className="text-neutral-400" aria-label="What is bounce rate?">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-56">
            <p className="font-medium">Bounce rate</p>
            <p className="mt-1 text-neutral-400">Sessions with one pageview and no events. 42% this week, down 3 pts.</p>
          </TooltipContent>
        </Tooltip>
      </span>
    </div>
  );
}
