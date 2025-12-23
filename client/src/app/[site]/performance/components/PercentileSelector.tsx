"use client";

import { cn } from "@/lib/utils";
import { PercentileLevel, usePerformanceStore } from "../performanceStore";

const PERCENTILE_OPTIONS: {
  value: PercentileLevel;
  label: string;
  color: string;
}[] = [
  { value: "p50", label: "P50", color: "hsl(var(--indigo-100))" },
  { value: "p75", label: "P75", color: "hsl(var(--indigo-300))" },
  { value: "p90", label: "P90", color: "hsl(var(--indigo-400))" },
  { value: "p99", label: "P99", color: "hsl(var(--indigo-500))" },
];

export function PercentileSelector() {
  const { selectedPercentile, setSelectedPercentile } = usePerformanceStore();

  return (
    <div className="flex items-center space-x-2">
      {PERCENTILE_OPTIONS.map(option => {
        const isSelected = selectedPercentile === option.value;

        return (
          <button
            key={option.value}
            onClick={() => setSelectedPercentile(option.value)}
            className={cn(
              "flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium transition-all",
              isSelected
                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400"
            )}
          >
            <div
              className={cn("w-3 h-3 rounded-sm transition-opacity", isSelected ? "opacity-100" : "opacity-30")}
              style={{ backgroundColor: option.color }}
            />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
