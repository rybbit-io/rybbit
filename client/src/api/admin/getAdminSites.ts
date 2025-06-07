import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../../lib/const";
import { authedFetchWithError } from "../utils";

export interface AdminSiteData {
  siteId: number;
  domains: string[];
  createdAt: string;
  public: boolean;
  eventsLast24Hours: number;
  organizationOwnerEmail: string | null;
}

export async function getAdminSites() {
  return authedFetchWithError<AdminSiteData[]>(`${BACKEND_URL}/admin/sites`);
}

export function useAdminSites() {
  return useQuery<AdminSiteData[]>({
    queryKey: ["admin-sites"],
    queryFn: getAdminSites,
  });
}
