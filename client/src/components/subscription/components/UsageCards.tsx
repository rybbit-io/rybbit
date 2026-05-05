import { authClient } from "@/lib/auth";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { useOrganizationMembers } from "@/api/admin/hooks/useOrganizationMembers";
import { useStripeSubscription } from "../../../lib/subscription/useStripeSubscription";

interface UsageCardItem {
  label: string;
  current: number;
  limit: number | null;
}

function UsageCard({ label, current, limit }: UsageCardItem) {
  const percentage =
    limit === null ? 0 : Math.min((current / limit) * 100, 100);
  const isExceeded = limit !== null && current >= limit;

  return (
    <div className="rounded-lg border p-3 pb-0 overflow-hidden relative">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mb-3">
        {current.toLocaleString()} /{" "}
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

export function UsageCards() {
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const organizationId = activeOrg?.id;

  const { data: sitesData } = useGetSitesFromOrg(organizationId);
  const { data: membersData } = useOrganizationMembers(organizationId ?? "");

  if (!subscription) return null;

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

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <UsageCard key={item.label} {...item} />
      ))}
    </div>
  );
}
