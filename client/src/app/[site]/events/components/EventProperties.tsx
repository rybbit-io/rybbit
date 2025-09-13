"use client";

import NumberFlow from "@number-flow/react";
import { Info } from "lucide-react";
import { memo } from "react";
import { EventProperty } from "../../../../api/analytics/events/useGetEventProperties";
import { cn } from "../../../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EventPropertiesProps {
  properties: EventProperty[];
  isLoading: boolean;
  selectedEvent: string | null;
  size?: "small" | "large";
}

export function EventProperties({
  properties,
  isLoading,
  selectedEvent,
  size = "small",
}: EventPropertiesProps) {
  if (isLoading) {
    return <EventPropertiesSkeleton size={size} />;
  }

  if (!selectedEvent) {
    return (
      <div className="text-neutral-300 w-full text-center py-8 flex flex-col gap-2 items-center justify-center">
        <Info className="w-6 h-6" />
        <p>Select an event to view its properties</p>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="text-neutral-300 w-full text-center py-8 flex flex-col gap-2 items-center justify-center">
        <Info className="w-6 h-6" />
        <p>No properties found for this event</p>
      </div>
    );
  }

  // Group properties by propertyKey
  const groupedProperties = properties.reduce((acc, property) => {
    if (!acc[property.propertyKey]) {
      acc[property.propertyKey] = [];
    }
    acc[property.propertyKey].push(property);
    return acc;
  }, {} as Record<string, EventProperty[]>);

  // Sort keys by the total count of their values
  const sortedKeys = Object.keys(groupedProperties).sort((a, b) => {
    const sumA = groupedProperties[a].reduce(
      (sum, prop) => sum + prop.count,
      0
    );
    const sumB = groupedProperties[b].reduce(
      (sum, prop) => sum + prop.count,
      0
    );
    return sumB - sumA;
  });

  return (
    <div
      className={cn(
        "flex flex-col gap-4 overflow-y-auto pr-2",
        size === "small" ? "max-h-[30vh]" : "max-h-[60vh]"
      )}
    >
      {sortedKeys.map((key) => {
        // Sort property values by count (descending)
        const values = groupedProperties[key].sort((a, b) => b.count - a.count);

        return (
          <div
            key={key}
            className={cn(
              "flex flex-col gap-1",
              size === "small" ? "text-xs" : "text-sm"
            )}
          >
            {/* Property Key Header */}
            <div className="font-semibold  text-primary py-1 border-b border-neutral-800">
              {key}
            </div>

            {/* Property Values */}
            <div className="pl-4 flex flex-col gap-2">
              {values.map((property) => {
                const totalCount = properties.filter(event => event.propertyKey === property.propertyKey)
                  .reduce((sum, event) => sum + event.count, 0);
                const percentage = (property.count / totalCount) * 100;

                return (
                  <div
                    key={`${property.propertyKey}-${property.propertyValue}`}
                    className={cn(
                      "relative flex items-center hover:bg-neutral-850 group px-2 rounded-md",
                      size === "small" ? "h-6" : "h-8"
                    )}
                  >
                    <div
                      className="absolute inset-0 bg-dataviz py-2 opacity-25 rounded-md"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="z-10 flex justify-between items-center w-full">
                      <div className="truncate max-w-[70%]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center">
                              {property.propertyValue}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-7xl">
                              {property.propertyValue}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex gap-2">
                        <div className="hidden group-hover:block text-neutral-400">
                          {Math.round(percentage * 10) / 10}%
                        </div>
                        <NumberFlow
                          respectMotionPreference={false}
                          value={property.count}
                          format={{ notation: "compact" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Skeleton component for EventProperties
const EventPropertiesSkeleton = memo(
  ({ size = "small" }: { size?: "small" | "large" }) => {
    // Generate random number of property groups (2-4)
    const groupCount = 2 + Math.floor(Math.random() * 3);

    // Generate random number of properties per group (2-5)
    const propertyCounts = Array.from(
      { length: groupCount },
      () => 2 + Math.floor(Math.random() * 4)
    );

    // Generate random widths for property values
    const generateWidths = (count: number) =>
      Array.from({ length: count }, () => 20 + Math.random() * 80);

    // Generate random widths for property bars
    const generateBarWidths = (count: number) =>
      Array.from({ length: count }, () => 20 + Math.random() * 80);

    return (
      <div
        className={cn(
          "flex flex-col gap-4 overflow-y-auto pr-2",
          size === "small" ? "max-h-[30vh]" : "max-h-[60vh]"
        )}
      >
        {Array.from({ length: groupCount }).map((_, groupIndex) => (
          <div
            key={groupIndex}
            className={cn(
              "flex flex-col gap-1",
              size === "small" ? "text-xs" : "text-sm"
            )}
          >
            {/* Property Key Header Skeleton */}
            <div className="font-semibold py-1 border-b border-neutral-800">
              <div className="h-4 bg-neutral-800 rounded animate-pulse w-24"></div>
            </div>

            {/* Property Values Skeleton */}
            <div className="pl-4 flex flex-col gap-2">
              {Array.from({ length: propertyCounts[groupIndex] }).map(
                (_, propIndex) => {
                  const valueWidths = generateWidths(
                    propertyCounts[groupIndex]
                  );
                  const barWidths = generateBarWidths(
                    propertyCounts[groupIndex]
                  );

                  return (
                    <div
                      key={propIndex}
                      className={cn(
                        "relative flex items-center px-2 rounded-md",
                        size === "small" ? "h-6" : "h-8"
                      )}
                    >
                      <div
                        className="absolute inset-0 bg-neutral-800 py-2 opacity-25 rounded-md animate-pulse"
                        style={{ width: `${barWidths[propIndex]}%` }}
                      ></div>
                      <div className="z-10 flex justify-between items-center w-full">
                        <div className="truncate max-w-[70%]">
                          <div
                            className="h-4 bg-neutral-800 rounded animate-pulse"
                            style={{ width: `${valueWidths[propIndex]}px` }}
                          ></div>
                        </div>
                        <div className="flex gap-2">
                          <div
                            className="h-4 bg-neutral-800 rounded animate-pulse"
                            style={{ width: "40px" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
);
