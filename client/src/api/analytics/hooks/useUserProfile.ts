import { Query } from "@tanstack/react-query";
import { Time } from "../../../components/DateSelector/types";
import { USER_DETAIL_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters } from "../../../lib/store";
import { UserGoal, UserRepeatedError, UserSegments, UserSessionGoals, UserSummary } from "../endpoints/userProfile";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

// Every profile panel applies the page's own filter set, the way useUserInfo
// does: an empty set must mean "no filters", not "the store's filters".
const profileFilters = () => {
  const filters = getFilteredFilters(USER_DETAIL_PAGE_FILTERS);
  return { useFilters: filters.length > 0, customFilters: filters };
};

const userPath = (userId: string, panel: string) => `users/${encodeURIComponent(userId)}/${panel}`;

/**
 * Placeholder policy for queries keyed `[name, userId, …]`: keep the previous
 * result on screen while a date or filter change refetches, but never carry
 * one user's numbers over to the next user. The shared same-site policy would,
 * and stepping between profiles makes that visible.
 */
export const sameUserPlaceholder =
  <TData>(userId: string) =>
  (previousData: TData | undefined, previousQuery: Query<TData, Error> | undefined) =>
    previousQuery?.queryKey?.[1] === userId ? previousData : undefined;

/**
 * The stat band's numbers for the selected period, or for the comparison
 * period. The comparison query is disabled when the comparison is off, so its
 * data is undefined and the deltas drop out.
 */
export function useUserSummary(userId: string, periodTime: "current" | "previous" = "current") {
  return useAnalyticsQuery<UserSummary>({
    key: ["user-summary", userId, periodTime],
    path: userPath(userId, "summary"),
    periodTime,
    ...profileFilters(),
    enabled: !!userId,
    props: { placeholderData: sameUserPlaceholder<UserSummary>(userId) },
  });
}

export function useUserGoals(userId: string) {
  return useAnalyticsQuery<UserGoal[]>({
    key: ["user-goals", userId],
    path: userPath(userId, "goals"),
    ...profileFilters(),
    enabled: !!userId,
    props: { placeholderData: sameUserPlaceholder<UserGoal[]>(userId) },
  });
}

/**
 * Which goals each listed session completed. `time` must be the window the
 * session list itself was fetched with (the selected period, or the one day
 * picked on the activity calendar).
 */
export function useUserSessionGoals(userId: string, sessionIds: string[], time?: Time) {
  return useAnalyticsQuery<UserSessionGoals[]>({
    key: ["user-session-goals", userId],
    path: userPath(userId, "session-goals"),
    overrideTime: time,
    ...profileFilters(),
    params: { session_ids: sessionIds },
    // Markers belong to the exact sessions asked about: no stand-in from another page.
    placeholder: false,
    enabled: !!userId && sessionIds.length > 0,
  });
}

export function useUserSegments(userId: string) {
  return useAnalyticsQuery<UserSegments>({
    key: ["user-segments", userId],
    path: userPath(userId, "segments"),
    ...profileFilters(),
    enabled: !!userId,
    props: { placeholderData: sameUserPlaceholder<UserSegments>(userId) },
  });
}

export function useUserRepeatedError(userId: string) {
  return useAnalyticsQuery<UserRepeatedError | null>({
    key: ["user-repeated-error", userId],
    path: userPath(userId, "repeated-error"),
    ...profileFilters(),
    // An insight about one period must not linger over the next.
    placeholder: false,
    enabled: !!userId,
  });
}
