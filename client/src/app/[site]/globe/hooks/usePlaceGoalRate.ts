import type { Filter } from "@rybbit/shared";
import { Goal, GoalsResponse } from "../../../../api/analytics/endpoints";
import { useAnalyticsQuery } from "../../../../api/analytics/useAnalyticsQuery";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { mergeFilters } from "../../../../lib/pivots";

// The goals endpoint's largest page; a site with more goals than this is compared on its newest ones.
const GOAL_PAGE_SIZE = 100;

const SIGNUP_NAME = /sign[\s_-]?up|register|registration/i;

/**
 * The goal a place's conversion rate is stated for: the one named like a
 * signup if the site has one, otherwise the goal with the most conversions in
 * the period. Null when the site has no goal that converted.
 */
export function resolveHeadlineGoal(goals: Goal[] | undefined): Goal | null {
  if (!goals?.length) return null;
  const signup = goals.find(goal => goal.name && SIGNUP_NAME.test(goal.name));
  if (signup) return signup;
  const busiest = goals.reduce((best, goal) => (goal.total_conversions > best.total_conversions ? goal : best));
  return busiest.total_conversions > 0 ? busiest : null;
}

function useGoals(extraFilters: Filter[], enabled: boolean) {
  // The goals endpoint honours the goals page's filter set, as on that page.
  const filters = mergeFilters(getFilteredFilters(GOALS_PAGE_FILTERS), extraFilters);

  return useAnalyticsQuery<GoalsResponse>({
    key: "goals",
    path: "goals",
    unwrap: false,
    useFilters: filters.length > 0,
    customFilters: filters,
    enabled,
    // Another place's rate must never stand in for this one's while it loads.
    placeholder: extraFilters.length === 0,
    params: { page: 1, page_size: GOAL_PAGE_SIZE, sort: "createdAt", order: "desc" },
  });
}

export interface PlaceGoalRate {
  name: string;
  /** Share of the place's sessions that completed the goal, 0-100. */
  rate: number;
  /** The same goal's rate across the page's whole population, 0-100. */
  siteRate: number;
}

/**
 * How one place converts on the site's headline goal, next to the site as a
 * whole. Null while loading, when no goal can be resolved, or when the viewer
 * may not read goals: the card then leaves the figure out.
 */
export function usePlaceGoalRate(placeFilters: Filter[], enabled: boolean): PlaceGoalRate | null {
  const site = useGoals([], enabled);
  const goal = resolveHeadlineGoal(site.data?.data);
  const place = useGoals(placeFilters, enabled && !!goal);

  if (!goal) return null;
  const placeGoal = place.data?.data.find(candidate => candidate.goalId === goal.goalId);
  if (!placeGoal || placeGoal.total_sessions === 0) return null;

  return {
    name: goal.name || goal.config.eventName || goal.config.pathPattern || "",
    rate: placeGoal.conversion_rate * 100,
    siteRate: goal.conversion_rate * 100,
  };
}
