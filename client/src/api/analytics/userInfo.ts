import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../utils";

export type UserInfo = {
  duration: number;
  sessions: number;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_height: number;
  screen_width: number;
  last_seen: string;
  first_seen: string;
  pageviews: number;
  events: number;
  ip?: string;
};

export function useUserInfo(siteId: number, userId: string) {
  return useQuery<UserInfo>({
    queryKey: ["user-info", userId, siteId],
    queryFn: async () => {
      const response = await authedFetch<{ data: UserInfo }>(`/user/info/${userId}/${siteId}`);
      return response.data;
    },
  });
}
