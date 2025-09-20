import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../lib/store";
import { authedFetch } from "../utils";

// Define the interface for processed retention data
export interface ProcessedRetentionData {
  cohorts: Record<string, { size: number; percentages: (number | null)[] }>;
  maxPeriods: number;
  mode: "day" | "week";
  range: number;
}

export type RetentionMode = "day" | "week";

export function useGetRetention(mode: RetentionMode = "week", range: number = 90) {
  const { site } = useStore();
  return useQuery<ProcessedRetentionData>({
    queryKey: ["retention", site, mode, range],
    queryFn: async () => {
      const response = await authedFetch<{
        data: ProcessedRetentionData;
      }>(`/retention/${site}`, { mode, range });
      return response.data;
    },
  });
}
