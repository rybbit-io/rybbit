"use client";

import { useExtracted } from "next-intl";
import { SegmentedControl } from "@/components/interior/segmented-control";
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
  const t = useExtracted();
  const { selectedPercentile, setSelectedPercentile } = usePerformanceStore();

  return (
    <SegmentedControl<PercentileLevel>
      aria-label={t("Percentile")}
      size="sm"
      options={PERCENTILE_OPTIONS.map(option => ({
        value: option.value,
        // The swatch matches this percentile's line in the chart below.
        label: (
          <>
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: option.color }} />
            {option.label}
          </>
        ),
      }))}
      value={selectedPercentile}
      onValueChange={setSelectedPercentile}
    />
  );
}
