"use client";

import { Activity, Eye, MousePointerClick, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";
import { GetSitesFromOrgResponse } from "../api/admin/sites";
import { formatDuration } from "../lib/dateTimeUtils";
import { Card } from "./ui/card";

interface SitesSummaryStatsProps {
  sites: GetSitesFromOrgResponse["sites"];
  isLoading?: boolean;
}

export function SitesSummaryStats({ sites, isLoading }: SitesSummaryStatsProps) {
  const stats = useMemo(() => {
    if (!sites || sites.length === 0) {
      return {
        totalSites: 0,
        totalUsers: 0,
        totalSessions: 0,
        totalPageviews: 0,
        avgBounceRate: 0,
        avgSessionDuration: 0,
        avgPagesPerSession: 0,
        usersChange: 0,
        sessionsChange: 0,
        pageviewsChange: 0,
      };
    }

    const totals = sites.reduce(
      (acc, site) => ({
        users: acc.users + (site.metrics?.users ?? 0),
        sessions: acc.sessions + (site.metrics?.sessions ?? 0),
        pageviews: acc.pageviews + (site.metrics?.pageviews ?? 0),
        bounceRate: acc.bounceRate + (site.metrics?.bounceRate ?? 0),
        sessionDuration: acc.sessionDuration + (site.metrics?.sessionDuration ?? 0),
        pagesPerSession: acc.pagesPerSession + (site.metrics?.pagesPerSession ?? 0),
        usersChange: acc.usersChange + (site.metrics?.usersChange ?? 0),
        sessionsChange: acc.sessionsChange + (site.metrics?.sessionsChange ?? 0),
        pageviewsChange: acc.pageviewsChange + (site.metrics?.pageviewsChange ?? 0),
        count: acc.count + 1,
      }),
      {
        users: 0,
        sessions: 0,
        pageviews: 0,
        bounceRate: 0,
        sessionDuration: 0,
        pagesPerSession: 0,
        usersChange: 0,
        sessionsChange: 0,
        pageviewsChange: 0,
        count: 0,
      }
    );

    return {
      totalSites: sites.length,
      totalUsers: totals.users,
      totalSessions: totals.sessions,
      totalPageviews: totals.pageviews,
      avgBounceRate: totals.bounceRate / totals.count,
      avgSessionDuration: totals.sessionDuration / totals.count,
      avgPagesPerSession: totals.pagesPerSession / totals.count,
      usersChange: totals.usersChange / totals.count,
      sessionsChange: totals.sessionsChange / totals.count,
      pageviewsChange: totals.pageviewsChange / totals.count,
    };
  }, [sites]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    change,
    suffix = "",
  }: {
    icon: any;
    label: string;
    value: string | number;
    change?: number;
    suffix?: string;
  }) => (
    <Card className="p-4 bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            <Icon size={16} />
            {label}
          </div>
          <div className="text-2xl font-bold">
            {value}
            {suffix && <span className="text-lg ml-1">{suffix}</span>}
          </div>
          {change !== undefined && change !== 0 && (
            <div className="flex items-center gap-1 mt-1">
              {change > 0 ? (
                <TrendingUp size={14} className="text-green-600" />
              ) : (
                <TrendingDown size={14} className="text-red-600" />
              )}
              <span className={`text-xs font-medium ${change > 0 ? "text-green-600" : "text-red-600"}`}>
                {Math.abs(change).toFixed(1)}% vs previous period
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (isLoading) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      <StatCard icon={Activity} label="Total Sites" value={stats.totalSites} />
      <StatCard
        icon={Users}
        label="Total Users"
        value={stats.totalUsers.toLocaleString()}
        change={stats.usersChange}
      />
      <StatCard
        icon={MousePointerClick}
        label="Total Sessions"
        value={stats.totalSessions.toLocaleString()}
        change={stats.sessionsChange}
      />
      <StatCard
        icon={Eye}
        label="Total Pageviews"
        value={stats.totalPageviews.toLocaleString()}
        change={stats.pageviewsChange}
      />
      <StatCard
        icon={TrendingDown}
        label="Avg Bounce Rate"
        value={stats.avgBounceRate.toFixed(1)}
        suffix="%"
      />
      <StatCard
        icon={Activity}
        label="Avg Session Duration"
        value={formatDuration(stats.avgSessionDuration)}
      />
    </div>
  );
}
