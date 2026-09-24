import { USER_DETAIL_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters } from "../../../lib/store";
import { UserInfo } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

export function useUserInfo(siteId: number, userId: string) {
  const filteredFilters = getFilteredFilters(USER_DETAIL_PAGE_FILTERS);

  return useAnalyticsQuery<UserInfo>({
    // userId must stay at index 1 — useDeleteUser removes ["user-info", userId].
    key: ["user-info", userId],
    path: `users/${encodeURIComponent(userId)}`,
    site: siteId,
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so an empty page-filter set stays unfiltered.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    enabled: !!siteId && !!userId,
  });
}
