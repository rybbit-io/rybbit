import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { GoalDefinition, GoalPreview } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

/**
 * What a goal that has not been saved would have counted in the selected
 * period. Pass null while the definition is incomplete; debounce the
 * definition before passing it, since every distinct one is a request.
 */
export function useGetGoalPreview(definition: GoalDefinition | null) {
  const bucket = useStore(state => state.bucket);
  // The same filters the ledger applies, so the preview and the saved goal agree.
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  return useAnalyticsQuery<GoalPreview>({
    key: "goal-preview",
    path: "goals/preview",
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { bucket },
    body: () => definition,
    enabled: definition !== null,
    // A preview of another definition is not a stand-in for this one.
    placeholder: false,
    // A preview that failed (a pattern the server refuses, the rate limit) is
    // reported as unavailable rather than asked for again.
    props: { retry: false },
  });
}
