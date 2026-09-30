import { useOrgApiUsage } from "@/api/admin/hooks/useOrgApiUsage";
import { useOrganizationMembers } from "@/api/admin/hooks/useOrganizationMembers";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { authClient } from "@/lib/auth";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";

/**
 * What the active organization has used against its plan: site and member counts (undefined
 * until loaded) and today's org API requests.
 */
export function useOrgUsage() {
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const organizationId = activeOrg?.id;

  const { data: sitesData } = useGetSitesFromOrg(organizationId);
  const { data: membersData } = useOrganizationMembers(organizationId);
  const { data: apiUsage } = useOrgApiUsage(organizationId);

  // Mirrors the server's gate in createApiKey: free and basic plans can't hold API keys, so a
  // quota would describe a budget they can't spend. Only organization-owned keys count here;
  // personal keys are budgeted per user.
  const planName = subscription?.planName || "free";
  const hasApiAccess = planName !== "free" && !planName.includes("basic");

  return {
    siteCount: sitesData?.sites.length,
    memberCount: membersData?.data?.length,
    apiUsage: hasApiAccess && apiUsage?.metered ? apiUsage : undefined,
  };
}
