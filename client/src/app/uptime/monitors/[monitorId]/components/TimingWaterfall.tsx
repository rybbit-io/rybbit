"use client";

import { cn } from "@/lib/utils";
import { MonitorEvent } from "@/api/uptime/monitors";
import { getTimingSegments, renderTimingSegments, TimingSegment } from "./timingUtils";

interface TimingWaterfallProps {
  event: MonitorEvent;
}

function renderWaterfallSegment(
  timing: TimingSegment,
  props: { left: number; width: number; zIndex: number; index: number }
) {
  return (
    <div
      key={timing.label}
      className={cn("absolute h-full", timing.color)}
      style={{
        left: `${props.left}%`,
        width: `${props.width}%`,
        zIndex: props.zIndex,
      }}
      title={`${timing.label}: ${timing.time}ms`}
    />
  );
}

function TimingLegendItem({ timing }: { timing: TimingSegment }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <div className={cn("w-3 h-3 rounded", timing.color)} />
      <span className="text-neutral-400">{timing.label}:</span>
      <span className="font-mono">{timing.time}ms</span>
    </div>
  );
}

export function TimingWaterfall({ event }: TimingWaterfallProps) {
  const timings = getTimingSegments(event);
  const totalTime = event.response_time_ms || 0;

  if (timings.length === 0 || totalTime === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="text-sm font-medium mb-2">Timings</div>
      <div className="relative h-6 bg-neutral-800 rounded overflow-hidden">
        {renderTimingSegments(timings, totalTime, renderWaterfallSegment)}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {timings.map((timing) => (
          <TimingLegendItem key={timing.label} timing={timing} />
        ))}
      </div>
    </div>
  );
}