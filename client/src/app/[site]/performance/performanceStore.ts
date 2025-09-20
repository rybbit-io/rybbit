import { create } from "zustand";

export type PerformanceMetric = "lcp" | "cls" | "inp" | "fcp" | "ttfb";

export type PercentileLevel = "p50" | "p75" | "p90" | "p99";

type PerformanceStore = {
  selectedPercentile: PercentileLevel;
  setSelectedPercentile: (percentile: PercentileLevel) => void;
  selectedPerformanceMetric: PerformanceMetric;
  setSelectedPerformanceMetric: (metric: PerformanceMetric) => void;
};

export const usePerformanceStore = create<PerformanceStore>(set => ({
  selectedPercentile: "p90",
  setSelectedPercentile: percentile => set({ selectedPercentile: percentile }),
  selectedPerformanceMetric: "lcp",
  setSelectedPerformanceMetric: metric => set({ selectedPerformanceMetric: metric }),
}));
