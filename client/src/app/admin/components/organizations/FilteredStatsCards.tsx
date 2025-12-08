"use client";

import { useMemo } from "react";
import { AdminOrganizationData } from "@/api/admin/getAdminOrganizations";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Activity, Zap, Clock } from "lucide-react";

interface FilteredStatsCardsProps {
  organizations: AdminOrganizationData[];
  isLoading: boolean;
}

export function FilteredStatsCards({ organizations, isLoading }: FilteredStatsCardsProps) {
  const stats = useMemo(() => {
    const totalOrganizations = organizations.length;

    const activeOrganizations = organizations.filter(org =>
      org.sites.some(site => site.eventsLast30Days > 0)
    ).length;

    const events24h = organizations.reduce(
      (total, org) => total + org.sites.reduce((sum, site) => sum + Number(site.eventsLast24Hours || 0), 0),
      0
    );

    const events30d = organizations.reduce(
      (total, org) => total + org.sites.reduce((sum, site) => sum + Number(site.eventsLast30Days || 0), 0),
      0
    );

    return { totalOrganizations, activeOrganizations, events24h, events30d };
  }, [organizations]);

  const cards = [
    {
      title: "Total Organizations",
      value: stats.totalOrganizations,
      icon: Building2,
    },
    {
      title: "Active Organizations",
      value: stats.activeOrganizations,
      icon: Activity,
      description: "With events in past 30 days",
    },
    {
      title: "24h Events",
      value: stats.events24h,
      icon: Clock,
    },
    {
      title: "30d Events",
      value: stats.events30d,
      icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-lg p-6 hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{card.title}</div>
              <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            )}
            {card.description && (
              <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">{card.description}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
