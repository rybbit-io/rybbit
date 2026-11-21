"use client";

import { useState, useMemo } from "react";
import { AdminOrganizationData } from "@/api/admin/endpoints";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatter } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { useExtracted } from "next-intl";

interface SubscriptionTiersTableProps {
  organizations: AdminOrganizationData[] | undefined;
  isLoading: boolean;
}

export function SubscriptionTiersTable({ organizations, isLoading }: SubscriptionTiersTableProps) {
  const t = useExtracted();
  const [tierFilter, setTierFilter] = useState("");
  const [tierSorting, setTierSorting] = useState<{ column: string; direction: "asc" | "desc" }>({
    column: "count",
    direction: "desc",
  });

  const subscriptionBreakdown = useMemo(() => {
    if (!organizations || organizations.length === 0) return [];

    const tierData: Record<string, { count: number; events24h: number; events30d: number }> = {};
    let totalEvents24h = 0;
    let totalEvents30d = 0;

    organizations.forEach(org => {
      const planName = org.subscription.planName || "unknown";
      if (!tierData[planName]) {
        tierData[planName] = { count: 0, events24h: 0, events30d: 0 };
      }
      tierData[planName].count += 1;
      const org24h = org.sites.reduce((sum, site) => sum + Number(site.eventsLast24Hours || 0), 0);
      const org30d = org.sites.reduce((sum, site) => sum + Number(site.eventsLast30Days || 0), 0);
      tierData[planName].events24h += org24h;
      tierData[planName].events30d += org30d;
      totalEvents24h += org24h;
      totalEvents30d += org30d;
    });

    const totalOrgs = organizations.length;
    const result = Object.entries(tierData).map(([tier, data]) => ({
      tier,
      count: data.count,
      countPct: ((data.count / totalOrgs) * 100).toFixed(1),
      events24h: data.events24h,
      events24hPct: totalEvents24h > 0 ? ((data.events24h / totalEvents24h) * 100).toFixed(1) : "0.0",
      events30d: data.events30d,
      events30dPct: totalEvents30d > 0 ? ((data.events30d / totalEvents30d) * 100).toFixed(1) : "0.0",
      avgEvents24h: data.count > 0 ? Math.round(data.events24h / data.count) : 0,
      avgEvents30d: data.count > 0 ? Math.round(data.events30d / data.count) : 0,
    }));

    const filtered = tierFilter
      ? result.filter(r => r.tier.toLowerCase().includes(tierFilter.toLowerCase()))
      : result;

    return filtered.sort((a, b) => {
      const multiplier = tierSorting.direction === "asc" ? 1 : -1;
      const aVal = a[tierSorting.column as keyof typeof a];
      const bVal = b[tierSorting.column as keyof typeof b];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * multiplier;
      }
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });
  }, [organizations, tierSorting, tierFilter]);

  const handleTierSort = (column: string) => {
    setTierSorting(prev => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const SortIcon = ({ column }: { column: string }) =>
    tierSorting.column === column ? (
      <ChevronDown
        className={`h-4 w-4 transition-transform ${tierSorting.direction === "asc" ? "rotate-180" : ""}`}
      />
    ) : null;

  return (
    <div className="space-y-2">
      <Input
        placeholder={t("Filter subscription tiers...")}
        value={tierFilter}
        onChange={e => setTierFilter(e.target.value)}
        className="max-w-xs"
      />
    <div className="rounded-md border border-neutral-100 dark:border-neutral-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => handleTierSort("tier")}
            >
              <div className="flex items-center gap-1">
                {t("Subscription Tier")}
                <SortIcon column="tier" />
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => handleTierSort("count")}
            >
              <div className="flex items-center justify-end gap-1">
                {t("Organizations")}
                <SortIcon column="count" />
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => handleTierSort("events24h")}
            >
              <div className="flex items-center justify-end gap-1">
                {t("24h Events")}
                <SortIcon column="events24h" />
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => handleTierSort("events30d")}
            >
              <div className="flex items-center justify-end gap-1">
                {t("30d Events")}
                <SortIcon column="events30d" />
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => handleTierSort("avgEvents24h")}
            >
              <div className="flex items-center justify-end gap-1">
                {t("Avg 24h")}
                <SortIcon column="avgEvents24h" />
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => handleTierSort("avgEvents30d")}
            >
              <div className="flex items-center justify-end gap-1">
                {t("Avg 30d")}
                <SortIcon column="avgEvents30d" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array(5)
              .fill(0)
              .map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-28 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-28 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
          ) : subscriptionBreakdown.length > 0 ? (
            subscriptionBreakdown.map(({ tier, count, countPct, events24h, events24hPct, events30d, events30dPct, avgEvents24h, avgEvents30d }) => (
              <TableRow key={tier}>
                <TableCell>
                  <Badge variant={tier === "free" ? "secondary" : "default"}>{tier}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">{formatter(count)}</span>
                  <span className="text-neutral-500 dark:text-neutral-400 ml-1">({countPct}%)</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">{formatter(events24h)}</span>
                  <span className="text-neutral-500 dark:text-neutral-400 ml-1">({events24hPct}%)</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">{formatter(events30d)}</span>
                  <span className="text-neutral-500 dark:text-neutral-400 ml-1">({events30dPct}%)</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">{formatter(avgEvents24h)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">{formatter(avgEvents30d)}</span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                {t("No subscription data available")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    </div>
  );
}
