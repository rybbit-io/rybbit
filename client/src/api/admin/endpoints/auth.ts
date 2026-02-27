import { authedFetch } from "../../utils";

export type GetOrganizationMembersResponse = {
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
    siteAccess: {
      hasRestrictedSiteAccess: boolean;
      siteIds: number[];
    };
  }[];
};

export function getOrganizationMembers(organizationId: string) {
  return authedFetch<GetOrganizationMembersResponse>(`/organizations/${organizationId}/members`);
}

export function updateMemberSiteAccess(
  organizationId: string,
  memberId: string,
  data: { hasRestrictedSiteAccess: boolean; siteIds: number[] }
) {
  return authedFetch(
    `/organizations/${organizationId}/members/${memberId}/sites`,
    undefined,
    {
      method: "PUT",
      data,
    }
  );
}
