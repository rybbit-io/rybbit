import { authClient } from "@/lib/auth";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { useOrganizationMembers } from "@/api/admin/hooks/useOrganizationMembers";
import { useOrgApiUsage } from "@/api/admin/hooks/useOrgApiUsage";
import { useStripeSubscription } from "../../../lib/subscription/useStripeSubscription";

interface UsageCardItem {
  label: string;
  current: number;
  limit: number | null;
  /** The count could not be read. Shows a placeholder instead of a false zero. */
  unavailable?: boolean;
}

function UsageCard({ label, current, limit, unavailable }: UsageCardItem) {
  const percentage =
    limit === null || unavailable ? 0 : Math.min((current / limit) * 100, 100);
  const isExceeded = !unavailable && limit !== null && current >= limit;

  return (
    <div className="rounded-lg border p-3 pb-0 overflow-hidden relative">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mb-3">
        {unavailable ? "—" : current.toLocaleString()} /{" "}
        {limit === null ? "Unlimited" : limit.toLocaleString()}
      </div>
      <div className="relative h-1.5 -mx-3">
        <div className="bg-neutral-100 dark:bg-neutral-700 h-1.5 w-full absolute bottom-0 left-0"></div>
        <div
          style={{ width: `${percentage}%` }}
          className={`h-1.5 absolute bottom-0 left-0 ${
            isExceeded ? "bg-red-500" : "bg-accent-400/75"
          }`}
        ></div>
      </div>
    </div>
  );
}

// Tailwind only emits classes it can see as literals, so the column count maps
// to a fixed class rather than being interpolated.
const COLUMN_CLASSES: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function UsageCards() {
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const organizationId = activeOrg?.id;

  const { data: sitesData } = useGetSitesFromOrg(organizationId);
  const { data: membersData } = useOrganizationMembers(organizationId ?? "");
  const { data: apiUsage } = useOrgApiUsage(organizationId);

  if (!subscription) return null;

  // Mirrors the server's gate in createApiKey: free and basic plans can't hold
  // API keys, so a quota card would describe a budget they can't spend.
  const planName = subscription.planName || "free";
  const hasApiAccess = planName !== "free" && !planName.includes("basic");

  const items: UsageCardItem[] = [
    {
      label: "Events used this month",
      current: subscription.monthlyEventCount || 0,
      limit: subscription.eventLimit || 0,
    },
    {
      label: "Websites",
      current: sitesData?.sites.length ?? 0,
      limit: subscription.siteLimit,
    },
    {
      label: "Team Members",
      current: membersData?.data?.length ?? 0,
      limit: subscription.memberLimit,
    },
  ];

  // Organization-owned keys only — personal keys are budgeted per user, so
  // their usage isn't part of this number.
  if (hasApiAccess && apiUsage?.metered) {
    items.push({
      label: "Org API requests today",
      current: apiUsage.dailyUsed,
      limit: apiUsage.dailyLimit,
      unavailable: !apiUsage.available,
    });
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
        COLUMN_CLASSES[items.length] ?? "lg:grid-cols-4"
      }`}
    >
      {items.map((item) => (
        <UsageCard key={item.label} {...item} />
      ))}
    </div>
  );
}
