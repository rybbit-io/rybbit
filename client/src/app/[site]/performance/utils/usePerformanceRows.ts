import { useMemo } from "react";
import { PerformanceByDimensionItem } from "@/api/analytics/endpoints";
import { useGetPerformanceByDimension } from "@/api/analytics/hooks/performance/useGetPerformanceByDimension";
import { useComparisonEnabled, useStore } from "@/lib/store";

/** The dimensions the by-dimension endpoint groups by. Each is also a filter parameter. */
export type PerformanceDimension = "pathname" | "country" | "region" | "device_type" | "browser" | "operating_system";

export const PERFORMANCE_PAGE_SIZE = 25;

export type PerformanceSort = { by: string; desc: boolean };

export const DEFAULT_PERFORMANCE_SORT: PerformanceSort = { by: "event_count", desc: true };

const EMPTY: PerformanceByDimensionItem[] = [];

/**
 * One page of rows for a dimension, and the same rows in the comparison
 * period.
 *
 * The previous period is asked for by name, with a filter on exactly the
 * values on screen: its own first page would be a different set of rows
 * whenever the ranking moved. It runs once the current rows are known and
 * stops when the comparison is turned off.
 */
export function usePerformanceRows({
  dimension,
  page = 1,
  sort = DEFAULT_PERFORMANCE_SORT,
}: {
  dimension: PerformanceDimension;
  /** 1-based. */
  page?: number;
  sort?: PerformanceSort;
}) {
  const site = useStore(state => state.site);
  const comparisonEnabled = useComparisonEnabled();

  const { data, isLoading, isFetching, isPlaceholderData } = useGetPerformanceByDimension({
    site,
    dimension,
    page,
    limit: PERFORMANCE_PAGE_SIZE,
    sortBy: sort.by,
    sortOrder: sort.desc ? "desc" : "asc",
  });

  const rows = data?.data ?? EMPTY;
  const values = useMemo(() => rows.map(row => String(row[dimension])), [rows, dimension]);

  const previousQuery = useGetPerformanceByDimension({
    site,
    dimension,
    periodTime: "previous",
    limit: PERFORMANCE_PAGE_SIZE,
    additionalFilters: [{ parameter: dimension, type: "equals", value: values }],
    // Rows still on screen from the last request would ask for the wrong names.
    enabled: comparisonEnabled && values.length > 0 && !isPlaceholderData,
  });

  // A previous period carried over from another request, or left behind when
  // the comparison was turned off, would be compared against the wrong rows.
  const previousRows =
    comparisonEnabled && !isPlaceholderData && !previousQuery.isPlaceholderData ? previousQuery.data?.data : undefined;

  const previousByValue = useMemo(
    () => new Map((previousRows ?? EMPTY).map(row => [String(row[dimension]), row])),
    [previousRows, dimension]
  );

  return {
    rows,
    totalCount: data?.totalCount ?? 0,
    previousByValue,
    /** False while the comparison is off or still loading: there is no change to show yet. */
    hasPrevious: previousRows !== undefined,
    isLoading,
    isFetching,
  };
}
