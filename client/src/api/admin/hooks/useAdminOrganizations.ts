import { useQuery } from "@tanstack/react-query";
import { getAdminOrganizations, AdminOrganizationData } from "../endpoints";

export function useAdminOrganizations() {
  return useQuery<AdminOrganizationData[]>({
    queryKey: ["admin-organizations"],
    queryFn: getAdminOrganizations,
  });
}
