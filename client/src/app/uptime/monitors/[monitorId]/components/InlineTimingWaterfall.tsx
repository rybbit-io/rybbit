"use client";

import { cn } from "@/lib/utils";
import { MonitorEvent } from "@/api/uptime/monitors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getTimingSegments, renderTimingSegments, TimingSegment } from "./timingUtils";

interface InlineTimingWaterfallProps {
  event: MonitorEvent;
}

function renderInlineSegment(
  timing: TimingSegment,
  props: { left: number; width: number; zIndex: number; index: number }
) {
  return (
    <Tooltip key={timing.label}>
      <TooltipTrigger asChild>
        <div
          className={cn("absolute h-full", timing.color)}
          style={{
            left: `${props.left}%`,
            width: `${props.width}%`,
            zIndex: props.zIndex,
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="font-medium">{timing.label}</div>
        <div className="font-mono">{timing.time}ms</div>
      </TooltipContent>
    </Tooltip>
  );
}

export function InlineTimingWaterfall({ event }: InlineTimingWaterfallProps) {
  const timings = getTimingSegments(event);
  const totalTime = event.response_time_ms || 0;

  if (timings.length === 0 || totalTime === 0) {
    return <div className="w-24 h-3" />;
  }

  return (
    <TooltipProvider>
      <div className="relative h-3 w-40 bg-neutral-800 rounded overflow-hidden">
        {renderTimingSegments(timings, totalTime, renderInlineSegment)}
      </div>
    </TooltipProvider>
  );
}