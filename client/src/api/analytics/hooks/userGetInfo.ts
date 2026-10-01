import { Time } from "../../../components/DateSelector/types";
import { USER_DETAIL_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters } from "../../../lib/store";
import { UserInfo } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";
import { sameUserPlaceholder } from "./useUserProfile";

export function useUserInfo(
  siteId: number,
  userId: string,
  // `time` asks about a specific window instead of the selected period; the
  // profile uses it to read the user's first day for first-touch attribution.
  options: { time?: Time; enabled?: boolean } = {}
) {
  const filteredFilters = getFilteredFilters(USER_DETAIL_PAGE_FILTERS);

  return useAnalyticsQuery<UserInfo>({
    // userId must stay at index 1 — useDeleteUser removes ["user-info", userId].
    key: ["user-info", userId],
    path: `users/${encodeURIComponent(userId)}`,
    site: siteId,
    overrideTime: options.time,
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so an empty page-filter set stays unfiltered.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    enabled: !!siteId && !!userId && (options.enabled ?? true),
    // Stepping to another user must not show the previous user's profile while
    // the new one loads; a date or filter change keeps the current one up. A
    // pinned window gets no stand-in at all: the selected period's answer is
    // not an approximation of another window's.
    placeholder: false,
    props: options.time ? undefined : { placeholderData: sameUserPlaceholder<UserInfo>(userId) },
  });
}
