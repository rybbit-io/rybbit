"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

interface ActivityPeriod {
  start: number;
  end: number;
}

interface ActivitySliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  activityPeriods?: ActivityPeriod[];
  duration?: number;
  events?: Array<{ timestamp: number; type: string | number }>;
}

const ActivitySlider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, ActivitySliderProps>(
  ({ className, activityPeriods = [], duration = 100, events = [], ...props }, ref) => {
    const firstEventTime = events.length > 0 ? events[0].timestamp : 0;

    return (
      <div className="w-full">
        {/* Event Timeline */}
        <div className="relative h-6 w-full mb-2">
          {events.map((event, index) => {
            const relativeTime = event.timestamp - firstEventTime;
            const position = duration > 0 ? (relativeTime / duration) * 100 : 0;

            // Different colors for different event types
            const getEventColor = (type: string | number) => {
              const eventType = parseInt(type.toString());
              switch (eventType) {
                case 2:
                  return "bg-blue-500"; // FullSnapshot
                case 3:
                  return "bg-yellow-500"; // IncrementalSnapshot
                case 4:
                  return "bg-purple-500"; // Meta
                default:
                  return "bg-gray-500";
              }
            };

            // Calculate margins to prevent overflow
            // Event bubble is 8px (w-2), so we need 4px margin on each side
            // This translates to approximately 0.5% margin on typical screen widths
            const leftMargin = 0.5;
            const rightMargin = 0.5;
            const constrainedPosition = Math.max(leftMargin, Math.min(100 - rightMargin, position));

            return (
              <div
                key={index}
                className={cn("absolute w-2 h-2 rounded-full transform -translate-x-1/2", getEventColor(event.type))}
                style={{
                  left: `${constrainedPosition}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                title={`Event ${event.type} at ${new Date(event.timestamp).toLocaleTimeString()}`}
              />
            );
          })}
        </div>

        {/* Activity Slider */}
        <SliderPrimitive.Root
          ref={ref}
          className={cn("relative flex w-full touch-none select-none items-center", className)}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            {/* Inactive background */}
            <div className="absolute h-full w-full bg-neutral-300 dark:bg-neutral-700" />

            {/* Activity periods */}
            {activityPeriods.map((period, index) => {
              const startPercent = duration > 0 ? (period.start / duration) * 100 : 0;
              const widthPercent = duration > 0 ? ((period.end - period.start) / duration) * 100 : 0;

              return (
                <div
                  key={index}
                  className="absolute h-full bg-neutral-400 dark:bg-neutral-600"
                  style={{
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                />
              );
            })}

            {/* Progress range */}
            <SliderPrimitive.Range className="absolute h-full bg-green-500" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-green-500 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500 disabled:pointer-events-none disabled:opacity-50 dark:border-green-500 dark:bg-white" />
        </SliderPrimitive.Root>
      </div>
    );
  }
);
ActivitySlider.displayName = "ActivitySlider";

export { ActivitySlider };
