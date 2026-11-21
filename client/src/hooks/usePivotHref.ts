import { Filter } from "@rybbit/shared";
import { useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { buildPivotHref, PivotTarget } from "../lib/pivots";
import { useStore } from "../lib/store";

/**
 * Returns a builder for pivot links from the page being viewed: the Sessions,
 * Users or Replay page of the current site, with the current period and
 * private-link key, and the current filters narrowed by `extraFilters`.
 *
 * Check `canPivot(target, extraFilters)` (lib/pivots) before offering a link:
 * not every target can honour every filter.
 */
export function usePivotHref(): (target: PivotTarget, extraFilters?: Filter[]) => string {
  const context = useStore(
    useShallow(state => ({
      site: state.site,
      privateKey: state.privateKey,
      time: state.time,
      comparison: state.comparison,
      bucket: state.bucket,
      selectedStat: state.selectedStat,
      filters: state.filters,
      segmentId: state.segmentId,
    }))
  );
  const search = useSearchParams();

  return (target, extraFilters) => buildPivotHref(target, { ...context, search }, extraFilters);
}
