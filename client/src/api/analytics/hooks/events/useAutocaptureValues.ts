import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AUTOCAPTURE_TARGET_TYPES, AutocaptureTargetType } from "../../../../lib/events";
import { useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { AutocaptureValue, fetchAutocaptureValues } from "../../endpoints";

// Suggestions for goal/funnel-step value patterns: the most common values of
// an autocapture type's primary props (urls, button texts, form names, ...)
export function useAutocaptureValues(type: string, enabled: boolean = true) {
  const { site, time, timezone } = useStore();

  const params = buildApiParams(time);

  return useQuery({
    queryKey: ["autocapture-values", site, type, time, timezone],
    enabled: enabled && !!site,
    queryFn: () => fetchAutocaptureValues(site, { ...params, type }),
  });
}

// Same suggestions, fetched for every autocapture type at once (only types in
// `enabledTypes` actually query). Returns a map keyed by type so callers don't
// need one useAutocaptureValues call per type.
export function useAutocaptureValuesByType(
  enabledTypes: ReadonlySet<AutocaptureTargetType>
): Record<AutocaptureTargetType, AutocaptureValue[] | undefined> {
  const { site, time, timezone } = useStore();
  const params = buildApiParams(time);

  const results = useQueries({
    queries: AUTOCAPTURE_TARGET_TYPES.map(type => ({
      queryKey: ["autocapture-values", site, type, time, timezone],
      enabled: enabledTypes.has(type) && !!site,
      queryFn: () => fetchAutocaptureValues(site, { ...params, type }),
    })),
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
