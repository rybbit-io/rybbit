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
    teams: {
      id: string;
      name: string;
    }[];
  }[];
};

export function getOrganizationMembers(organizationId: string) {
  return authedFetch<GetOrganizationMembersResponse>(`/organizations/${organizationId}/members`);
}

export type GetOrgApiUsageResponse = {
  /** False on self-hosted, where API requests are not metered. */
  metered: boolean;
  /** False when the counter could not be read; the quota is still enforced. */
  available: boolean;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  resetsInSeconds: number;
  burstLimit: number;
  burstWindowSeconds: number;
};

export function getOrgApiUsage(organizationId: string) {
  return authedFetch<GetOrgApiUsageResponse>(`/organizations/${organizationId}/api-usage`);
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
