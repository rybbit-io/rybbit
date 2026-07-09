import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchAutocaptureValues } from "../../endpoints";

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
