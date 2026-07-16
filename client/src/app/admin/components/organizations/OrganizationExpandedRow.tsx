"use client";

import { ReactNode, useState } from "react";
import { AdminOrganizationData } from "@/api/admin/endpoints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth";
import { userStore } from "@/lib/userStore";
import { cn, formatter } from "@/lib/utils";
import { DateTime } from "luxon";
import { UserCheck } from "lucide-react";
import Link from "next/link";
import { useExtracted } from "next-intl";
import { CopyText } from "../../../../components/CopyText";
import { Favicon } from "../../../../components/Favicon";

interface OrganizationExpandedRowProps {
  organization: AdminOrganizationData;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h4 className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{children}</h4>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, member: 2 };

export function OrganizationExpandedRow({ organization }: OrganizationExpandedRowProps) {
  const t = useExtracted();
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const currentUserId = userStore.getState().user?.id;

  const subscription = organization.subscription;
  const periodEnd = subscription.currentPeriodEnd
    ? DateTime.fromJSDate(new Date(subscription.currentPeriodEnd))
    : null;

  const statusClass =
    subscription.status === "canceled"
      ? "text-red-500 dark:text-red-400"
      : subscription.status === "active" || subscription.status === "trialing"
        ? ""
        : "text-yellow-600 dark:text-yellow-500";

  const sites = [...organization.sites].sort((a, b) => b.eventsLast30Days - a.eventsLast30Days);
  const members = [...organization.members].sort((a, b) => {
    const rankDiff =
      (ROLE_RANK[a.role?.toLowerCase()] ?? 3) - (ROLE_RANK[b.role?.toLowerCase()] ?? 3);
    return rankDiff !== 0 ? rankDiff : (a.name || a.email).localeCompare(b.name || b.email);
  });

  const handleImpersonate = async (userId: string) => {
    try {
      setImpersonatingId(userId);
      await authClient.admin.impersonateUser({ userId });
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to impersonate user"));
      setImpersonatingId(null);
    }
  };

  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <section>
        <SectionLabel>{t("Subscription")}</SectionLabel>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-1">
          <Fact label={t("Plan")}>
            {subscription.planName}
            {subscription.interval && (
              <span className="ml-1.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {subscription.interval}
              </span>
            )}
          </Fact>
          <Fact label={t("Status")}>
            <span className={statusClass}>{subscription.status}</span>
            {subscription.cancelAtPeriodEnd && (
              <div className="mt-0.5 text-xs font-normal text-yellow-600 dark:text-yellow-500">
                {t("Cancels at period end")}
              </div>
            )}
          </Fact>
          <Fact label={t("Event limit")}>
            <span className="tabular-nums">
              {subscription.eventLimit ? formatter(subscription.eventLimit) : t("Unlimited")}
            </span>
          </Fact>
          {periodEnd?.isValid && (
            <Fact label={subscription.cancelAtPeriodEnd ? t("Ends") : t("Renews")}>
              <span className="tabular-nums">{periodEnd.toLocaleString(DateTime.DATE_MED)}</span>
              <span className="ml-1.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {periodEnd.toRelative()}
              </span>
            </Fact>
          )}
          <Fact label={t("Organization ID")}>
            <CopyText
              text={organization.id}
              maxLength={16}
              className="text-neutral-600 dark:text-neutral-300 [&>span]:text-xs"
              tooltipText={t("Copy organization ID")}
            />
          </Fact>
        </dl>
      </section>

      <div className="min-w-0 space-y-5">
        <section>
          <SectionLabel>
            {t("Sites")} <span className="tabular-nums">· {sites.length}</span>
          </SectionLabel>
          {sites.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="max-h-60 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
                {sites.map(site => (
                  <div key={site.siteId} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Favicon domain={site.domain} className="h-4 w-4 shrink-0" />
                      <Link
                        href={`/${site.siteId}`}
                        target="_blank"
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {site.name || site.domain}
                      </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-sm tabular-nums">
                      <span className="w-24 text-right">
                        {formatter(site.eventsLast24Hours)}
                        <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">24h</span>
                      </span>
                      <span className="w-24 text-right">
                        {formatter(site.eventsLast30Days)}
                        <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">30d</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">{t("No sites")}</div>
          )}
        </section>

        <section>
          <SectionLabel>
            {t("Members")} <span className="tabular-nums">· {members.length}</span>
          </SectionLabel>
          {members.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="max-h-60 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
                {members.map(member => (
                  <div key={member.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{member.name || member.email}</span>
                        <Badge
                          variant={member.role?.toLowerCase() === "owner" ? "default" : "outline"}
                          className="shrink-0"
                        >
                          {member.role}
                        </Badge>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {member.email}
                      </div>
                    </div>
                    <CopyText
                      text={member.userId}
                      maxLength={10}
                      className={cn("hidden text-neutral-500 dark:text-neutral-400 sm:flex", "[&>span]:text-xs")}
                      tooltipText={t("Copy user ID")}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImpersonate(member.userId)}
                      disabled={member.userId === currentUserId || impersonatingId !== null}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {impersonatingId === member.userId ? t("Impersonating...") : t("Impersonate")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">{t("No members")}</div>
          )}
        </section>
      </div>
    </div>
  );
}
