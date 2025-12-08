import { useQuery } from "@tanstack/react-query";
import { fetchUserInfo, UserInfo } from "../endpoints";

export function useUserInfo(siteId: number, userId: string) {
  return useQuery<UserInfo>({
    queryKey: ["user-info", userId, siteId],
    queryFn: () => fetchUserInfo(siteId, userId),
    enabled: !!siteId && !!userId,
  });
}
