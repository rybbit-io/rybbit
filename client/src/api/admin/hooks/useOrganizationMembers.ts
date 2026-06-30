import { useQuery } from "@tanstack/react-query";
import { getOrganizationMembers, GetOrganizationMembersResponse } from "../endpoints";

export const useOrganizationMembers = (organizationId?: string) => {
  return useQuery<GetOrganizationMembersResponse>({
    queryKey: ["organization-members", organizationId],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization ID is required");
      }

      return getOrganizationMembers(organizationId);
    },
    staleTime: Infinity,
    enabled: !!organizationId,
  });
};
