import { create } from "zustand";

export type PerformanceMetric = "lcp" | "cls" | "inp" | "fcp" | "ttfb";

export type PercentileLevel = "p50" | "p75" | "p90" | "p99";

type PerformanceStore = {
  selectedPercentile: PercentileLevel;
  setSelectedPercentile: (percentile: PercentileLevel) => void;
  selectedPerformanceMetric: PerformanceMetric;
  setSelectedPerformanceMetric: (metric: PerformanceMetric) => void;
  showAnnotations: boolean;
  setShowAnnotations: (show: boolean) => void;
};

export const usePerformanceStore = create<PerformanceStore>(set => ({
  // Core Web Vitals are assessed at the 75th percentile.
  selectedPercentile: "p75",
  setSelectedPercentile: percentile => set({ selectedPercentile: percentile }),
  selectedPerformanceMetric: "lcp",
  setSelectedPerformanceMetric: metric => set({ selectedPerformanceMetric: metric }),
  showAnnotations: true,
  setShowAnnotations: show => set({ showAnnotations: show }),
}));
