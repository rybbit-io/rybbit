"use client";

import { useExtracted } from "next-intl";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { EVENT_TYPE_CONFIG, EventType } from "@/lib/events";
import { EventTypeIcon } from "./EventIcons";

interface EventTypeFilterProps {
  visibleTypes: Set<string>;
  onToggle: (type: string) => void;
  events: { type: string }[];
}

export function EventTypeFilter({
  visibleTypes,
  onToggle,
  events,
}: EventTypeFilterProps) {
  const t = useExtracted();

  const translatedLabels: Record<string, string> = {
    Pageview: t("Pageview"),
    Event: t("Event"),
    Outbound: t("Outbound"),
    "Button Click": t("Button Click"),
    Copy: t("Copy"),
    "Form Submit": t("Form Submit"),
    "Input Change": t("Input Change"),
    Error: t("Error"),
  };

  // Calculate counts for each event type
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const event of events) {
      result[event.type] = (result[event.type] || 0) + 1;
    }
    return result;
  }, [events]);

  return (
    <div className="flex items-center space-x-2 overflow-x-auto">
      {EVENT_TYPE_CONFIG.map((option) => {
        const isSelected = visibleTypes.has(option.value);
        const count = counts[option.value] || 0;

        return (
          <button
            key={option.value}
            onClick={() => onToggle(option.value)}
            className={cn(
              "flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium transition-all whitespace-nowrap",
              isSelected
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                : "bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400"
            )}
          >
            <div
              className={cn(
                "transition-opacity",
                isSelected ? "opacity-100" : "opacity-30"
              )}
            >
              <EventTypeIcon type={option.value as EventType} className="h-3 w-3" />
            </div>
            <span>{translatedLabels[option.label] || option.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px] leading-none",
                  isSelected
                    ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
