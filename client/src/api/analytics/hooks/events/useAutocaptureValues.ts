import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { AUTOCAPTURE_TARGET_TYPES, AutocaptureTargetType } from "../../../../lib/events";
import { buildAnalyticsRequest, fetchAnalytics } from "../../analyticsRequest";
import { AutocaptureValue } from "../../endpoints";
import { useAnalyticsContext, useAnalyticsQuery } from "../../useAnalyticsQuery";

const DESCRIPTOR = (type: string) => ({ path: "events/autocapture-values", params: { type } });

// Suggestions for goal/funnel-step value patterns: the most common values of
// an autocapture type's primary props (urls, button texts, form names, ...)
export function useAutocaptureValues(type: string, enabled: boolean = true) {
  return useAnalyticsQuery<AutocaptureValue[]>({
    key: "autocapture-values",
    ...DESCRIPTOR(type),
    useFilters: false,
    enabled,
    // Suggestion lists were a plain useQuery before the seam: always refetch on
    // mount, and never show the previous type's values while a new type loads.
    staleTime: 0,
    placeholder: false,
  });
}

// Same suggestions, fetched for every autocapture type at once (only types in
// `enabledTypes` actually query). Returns a map keyed by type so callers don't
// need one useAutocaptureValues call per type.
export function useAutocaptureValuesByType(
  enabledTypes: ReadonlySet<AutocaptureTargetType>
): Record<AutocaptureTargetType, AutocaptureValue[] | undefined> {
  const { site, context } = useAnalyticsContext({ useFilters: false });

  const results = useQueries({
    queries: AUTOCAPTURE_TARGET_TYPES.map(type => {
      const request = buildAnalyticsRequest(DESCRIPTOR(type), context);
      return {
        queryKey: ["autocapture-values", site, request.path, request.params],
        enabled: enabledTypes.has(type) && !!site,
        queryFn: () => fetchAnalytics<AutocaptureValue[]>(site, request),
      };
    }),
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(
    () =>
      Object.fromEntries(AUTOCAPTURE_TARGET_TYPES.map((type, index) => [type, results[index].data])) as Record<
        AutocaptureTargetType,
        AutocaptureValue[] | undefined
      >,
    results.map(result => result.data)
  );
}
