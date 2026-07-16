import { useQuery } from "@tanstack/react-query";
import { USER_DETAIL_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import { fetchUserInfo, UserInfo } from "../endpoints";

export function useUserInfo(siteId: number, userId: string) {
  const { time, timezone } = useStore();
  const filteredFilters = getFilteredFilters(USER_DETAIL_PAGE_FILTERS);
  const params = buildApiParams(time, { filters: filteredFilters });

  return useQuery<UserInfo>({
    queryKey: ["user-info", userId, siteId, time, filteredFilters, timezone],
    queryFn: () => fetchUserInfo(siteId, userId, params),
    enabled: !!siteId && !!userId,
  });
}
