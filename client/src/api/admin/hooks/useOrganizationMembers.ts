import { useQuery } from "@tanstack/react-query";
import { getOrganizationMembers, GetOrganizationMembersResponse } from "../endpoints";

export const useOrganizationMembers = (organizationId: string) => {
  return useQuery<GetOrganizationMembersResponse>({
    queryKey: ["organization-members", organizationId],
    queryFn: () => getOrganizationMembers(organizationId),
    staleTime: Infinity,
  });
};
