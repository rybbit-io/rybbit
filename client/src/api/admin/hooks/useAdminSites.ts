import { useQuery } from "@tanstack/react-query";
import { getAdminSites, AdminSiteData } from "../endpoints";

export function useAdminSites() {
  return useQuery<AdminSiteData[]>({
    queryKey: ["admin-sites"],
    queryFn: getAdminSites,
  });
}
