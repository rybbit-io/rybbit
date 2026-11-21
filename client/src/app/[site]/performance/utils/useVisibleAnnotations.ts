import type { Annotation } from "@rybbit/shared";
import { useMemo } from "react";
import { useGetAnnotations } from "@/api/analytics/hooks/useAnnotations";
import { getChartTimeBounds } from "@/components/charts/timeSeriesChartUtils";
import { useStore, useTimezone } from "@/lib/store";
import { annotationsInWindow } from "./annotationWindow";

/** Timeline annotations (the ones written on the Main chart) inside the selected period. */
export function useVisibleAnnotations(): Annotation[] {
  const site = useStore(state => state.site);
  const time = useStore(state => state.time);
  const bucket = useStore(state => state.bucket);
  const timezone = useTimezone();
  const { data } = useGetAnnotations(site);

  return useMemo(
    () => (data?.length ? annotationsInWindow(data, getChartTimeBounds(time, bucket, timezone), bucket) : []),
    [data, time, bucket, timezone]
  );
}
