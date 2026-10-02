import type { SiteGrantRole } from "@rybbit/shared";
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
      /** The role all the member's site grants carry; null when they carry none (their organization role applies) or differ. */
      siteRole: SiteGrantRole | null;
      /** Each direct grant with its own role (null: the member's organization role applies on that site). */
      siteGrants?: { siteId: number; role: SiteGrantRole | null }[];
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
  data: {
    hasRestrictedSiteAccess: boolean;
    siteIds: number[];
    /** Raises the member's role on those sites; null leaves their organization role. */
    siteRole?: SiteGrantRole | null;
  }
) {
  return authedFetch(`/organizations/${organizationId}/members/${memberId}/sites`, undefined, {
    method: "PUT",
    data,
  });
}
