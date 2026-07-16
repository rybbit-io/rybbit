"use client";

import { ToggleChip } from "@/components/ToggleChip";
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
      {PERCENTILE_OPTIONS.map(option => (
        <ToggleChip
          key={option.value}
          isSelected={selectedPercentile === option.value}
          onClick={() => setSelectedPercentile(option.value)}
          swatchColor={option.color}
          label={option.label}
        />
      ))}
    </div>
  );
}
