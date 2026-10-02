"use client";

import { useExtracted } from "next-intl";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { PercentileLevel, usePerformanceStore } from "../performanceStore";

const PERCENTILES: PercentileLevel[] = ["p50", "p75", "p90", "p99"];

export function PercentileSelector() {
  const t = useExtracted();
  const { selectedPercentile, setSelectedPercentile } = usePerformanceStore();

  return (
    <SegmentedControl<PercentileLevel>
      aria-label={t("Percentile")}
      size="sm"
      options={PERCENTILES.map(percentile => ({ value: percentile, label: percentile }))}
      value={selectedPercentile}
      onValueChange={setSelectedPercentile}
    />
  );
}
