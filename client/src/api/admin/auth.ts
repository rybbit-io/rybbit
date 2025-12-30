import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../utils";

type GetOrganizationMembersResponse = {
  data: {
    id: string;
    role: string;
    userId: string;
    organizationId: string;
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
};

export const useOrganizationMembers = (organizationId: string) => {
  return useQuery<GetOrganizationMembersResponse>({
    queryKey: ["organization-members", organizationId],
    queryFn: () => authedFetch(`/organizations/${organizationId}/members`),
    staleTime: Infinity,
  });
};
