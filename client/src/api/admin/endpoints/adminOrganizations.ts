import { authedFetch } from "../../utils";

export interface AdminOrganizationData {
  id: string;
  name: string;
  createdAt: string;
  monthlyEventCount: number;
  overMonthlyLimit: boolean;
  subscription: {
    id: string | null;
    source: "custom" | "override" | "stripe" | "appsumo" | "free";
    planName: string;
    status: string;
    eventLimit: number;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
    interval?: string;
    memberLimit?: number | null;
    siteLimit?: number | null;
  };
  planOverride: string | null;
  customPlan: { events: number; members: number | null; websites: number | null } | null;
  stripeCustomerId: string | null;
  stripeDashboardUrl: string | null;
  sites: {
    siteId: number;
    name: string;
    domain: string;
    type: "web" | "mobile" | null;
    createdAt: string;
    eventsLast24Hours: number;
    eventsLast30Days: number;
  }[];
  members: {
    memberId: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

export function getAdminOrganizations() {
  return authedFetch<AdminOrganizationData[]>("/admin/organizations");
}

export interface AdminOrganizationOption {
  id: string;
  name: string;
}

export function getAdminOrganizationOptions(search: string, limit = 25) {
  return authedFetch<{ items: AdminOrganizationOption[] }>("/admin/organization-options", {
    search,
    limit,
  });
}

export interface AdminSubscriptionPlanOption {
  name: string;
  type: "stripe" | "appsumo";
  eventLimit: number;
  interval: string;
}

export function getAdminSubscriptionPlans() {
  return authedFetch<AdminSubscriptionPlanOption[]>("/admin/subscription-plans");
}

export type AdminSubscriptionOverrideInput =
  | { mode: "none" }
  | { mode: "preset"; planOverride: string }
  | {
      mode: "custom";
      customPlan: { events: number; members: number | null; websites: number | null };
    };

export function updateAdminSubscriptionOverride(organizationId: string, input: AdminSubscriptionOverrideInput) {
  return authedFetch<{ success: boolean }>(`/admin/organizations/${organizationId}/subscription-override`, undefined, {
    method: "PUT",
    data: input,
  });
}

export interface AdminOrganizationMemberDetail {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    banned: boolean;
    banReason: string | null;
    banExpires: string | null;
  };
  membership: {
    id: string;
    role: "owner" | "admin" | "member";
    hasRestrictedSiteAccess: boolean;
    siteIds: number[];
  };
  sites: Array<{ siteId: number; name: string; domain: string }>;
}

export function getAdminOrganizationMember(organizationId: string, memberId: string) {
  return authedFetch<AdminOrganizationMemberDetail>(`/admin/organizations/${organizationId}/members/${memberId}`);
}

export interface UpdateAdminOrganizationMemberInput {
  role: "owner" | "admin" | "member";
  hasRestrictedSiteAccess: boolean;
  siteIds: number[];
}

export function updateAdminOrganizationMember(
  organizationId: string,
  memberId: string,
  input: UpdateAdminOrganizationMemberInput
) {
  return authedFetch<{ success: boolean }>(`/admin/organizations/${organizationId}/members/${memberId}`, undefined, {
    method: "PATCH",
    data: input,
  });
}

export function deleteAdminOrganizationMember(organizationId: string, memberId: string) {
  return authedFetch<{ success: boolean }>(`/admin/organizations/${organizationId}/members/${memberId}`, undefined, {
    method: "DELETE",
  });
}
