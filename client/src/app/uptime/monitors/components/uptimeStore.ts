import { create } from "zustand";
import { TimeBucket } from "./UptimeBucketSelection";

export const TIME_RANGES = [
  { value: "1h", label: "1H" },
  { value: "6h", label: "6H" },
  { value: "12h", label: "12H" },
  { value: "24h", label: "24H" },
  { value: "3d", label: "3D" },
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "90d", label: "90D" },
  { value: "180d", label: "180D" },
  { value: "365d", label: "365D" },
  // { value: "all", label: "All Time" },
] as const;

export type TimeRange = (typeof TIME_RANGES)[number]["value"];

export const useUptimeStore = create<{
  timeRange: TimeRange;
  setTimeRange: (timeRange: (typeof TIME_RANGES)[number]["value"]) => void;
  bucket: TimeBucket;
  setBucket: (bucket: TimeBucket) => void;
  selectedRegion?: string;
  setSelectedRegion: (region?: string) => void;
}>((set) => ({
  timeRange: "24h",
  setTimeRange: (timeRange) => set({ timeRange }),
  bucket: "minute",
  setBucket: (bucket) => set({ bucket }),
  selectedRegion: undefined,
  setSelectedRegion: (region) => set({ selectedRegion: region }),
}));
