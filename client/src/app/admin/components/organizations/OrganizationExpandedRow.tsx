"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminOrganizationData } from "@/api/admin/getAdminOrganizations";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { formatter } from "@/lib/utils";
import { User, Building2, CreditCard, UserCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";
import { userStore } from "@/lib/userStore";
import { CopyText } from "../../../../components/CopyText";

interface OrganizationExpandedRowProps {
  organization: AdminOrganizationData;
}

export function OrganizationExpandedRow({ organization }: OrganizationExpandedRowProps) {
  const router = useRouter();

  const handleImpersonate = useCallback(
    async (userId: string) => {
      try {
        await authClient.admin.impersonateUser({
          userId,
        });
        window.location.reload();
        router.push("/");
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error(`Failed to impersonate user: ${errorMessage}`);
        return false;
      }
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <CopyText text={organization.id}></CopyText>

      {/* Subscription Details */}
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <CreditCard className="h-4 w-4" />
          Subscription Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-neutral-100 dark:border-neutral-800 rounded">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Plan</div>
            <div className="font-medium">{organization.subscription.planName}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Status</div>
            <div className="font-medium">{organization.subscription.status}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Event Limit</div>
            <div className="font-medium">
              {organization.subscription.eventLimit ? formatter(organization.subscription.eventLimit) : "Unlimited"}
            </div>
          </div>
          {organization.subscription.currentPeriodEnd && (
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Period End</div>
              <div className="font-medium">
                {formatDistanceToNow(new Date(organization.subscription.currentPeriodEnd), {
                  addSuffix: true,
                })}
              </div>
            </div>
          )}
          {organization.subscription.cancelAtPeriodEnd && (
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Cancellation</div>
              <div className="font-medium text-orange-400">Cancels at period end</div>
            </div>
          )}
        </div>
      </div>

      {/* Sites */}
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Building2 className="h-4 w-4" />
          Sites ({organization.sites.length})
        </div>
        {organization.sites.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {organization.sites.map(site => (
              <Link
                key={site.siteId}
                href={`/${site.siteId}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{site.domain}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatter(site.eventsLast24Hours)} events (24h) · {formatter(site.eventsLast30Days)} (30d)
                  </span>
                </div>
                <ExternalLink className="h-3 w-3" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-neutral-500 dark:text-neutral-400 p-4 border border-neutral-100 dark:border-neutral-800 rounded">
            No sites
          </div>
        )}
      </div>

      {/* Members */}
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <User className="h-4 w-4" />
          Members ({organization.members.length})
        </div>
        {organization.members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {organization.members.map(member => (
              <div
                key={member.userId}
                className="p-3 border border-neutral-100 dark:border-neutral-800 rounded flex items-center justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="font-medium flex items-center gap-2">
                    {member.name}{" "}
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-200">{member.email}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    <CopyText text={member.userId} className="text-xs"></CopyText>
                  </div>
                  <Button
                    onClick={() => handleImpersonate(member.userId)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                    disabled={member.userId === userStore.getState().user?.id}
                  >
                    <UserCheck className="h-3 w-3" />
                    Impersonate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-neutral-500 dark:text-neutral-400 p-4 border border-neutral-100 dark:border-neutral-800 rounded">
            No members
          </div>
        )}
      </div>
    </div>
  );
}
