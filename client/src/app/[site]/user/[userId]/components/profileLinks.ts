import { Filter } from "@rybbit/shared";
import { usePivotHref } from "../../../../../hooks/usePivotHref";

/** Pages of the site the profile links out to, as their route segment. */
export type ProfileRoute = "sessions" | "users" | "pages" | "events" | "goals" | "journeys";

/**
 * Points a Sessions pivot link at another page of the same site, keeping its
 * query string. The shared pivot builder only knows Sessions, Users and
 * Replay; the profile also links to Pages, Events, Goals and Journeys, which
 * read the same period and filters from the URL.
 */
export function withRoute(sessionsHref: string, route: ProfileRoute): string {
  return sessionsHref.replace(/\/sessions(?=\?|$)/, `/${route}`);
}

/** The filter that narrows any site page to one user. */
export const userFilter = (userId: string): Filter => ({ parameter: "user_id", type: "equals", value: [userId] });

/**
 * Returns a builder for links from the profile to another page of the site,
 * with the current period, comparison and private-link key, narrowed by
 * `extraFilters`. Every target used here accepts the `user_id` filter.
 */
export function useProfileHref(): (route: ProfileRoute, extraFilters?: Filter[]) => string {
  const pivotHref = usePivotHref();
  return (route, extraFilters) => withRoute(pivotHref("sessions", extraFilters), route);
}
