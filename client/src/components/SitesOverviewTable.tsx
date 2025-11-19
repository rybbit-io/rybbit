"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GetSitesFromOrgResponse } from "../api/admin/sites";
import { formatDuration } from "../lib/dateTimeUtils";
import { Favicon } from "./Favicon";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface SitesOverviewTableProps {
  sites: GetSitesFromOrgResponse["sites"];
  isLoading?: boolean;
}

type SortField = "domain" | "users" | "sessions" | "pageviews" | "bounceRate" | "sessionDuration" | "pagesPerSession";
type SortDirection = "asc" | "desc";

const MetricChange = ({ value, reverseColors }: { value: number; reverseColors?: boolean }) => {
  if (value === 0) return <span className="text-neutral-500">-</span>;

  const isPositive = value > 0;
  const isGood = reverseColors ? !isPositive : isPositive;

  return (
    <span className={`flex items-center gap-1 text-xs ${isGood ? "text-green-600" : "text-red-600"}`}>
      {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
};

export function SitesOverviewTable({ sites, isLoading }: SitesOverviewTableProps) {
  const [sortField, setSortField] = useState<SortField>("sessions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedSites = useMemo(() => {
    if (!sites) return [];

    return [...sites].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortField) {
        case "domain":
          aValue = a.domain;
          bValue = b.domain;
          break;
        case "users":
          aValue = a.metrics?.users ?? 0;
          bValue = b.metrics?.users ?? 0;
          break;
        case "sessions":
          aValue = a.metrics?.sessions ?? 0;
          bValue = b.metrics?.sessions ?? 0;
          break;
        case "pageviews":
          aValue = a.metrics?.pageviews ?? 0;
          bValue = b.metrics?.pageviews ?? 0;
          break;
        case "bounceRate":
          aValue = a.metrics?.bounceRate ?? 0;
          bValue = b.metrics?.bounceRate ?? 0;
          break;
        case "sessionDuration":
          aValue = a.metrics?.sessionDuration ?? 0;
          bValue = b.metrics?.sessionDuration ?? 0;
          break;
        case "pagesPerSession":
          aValue = a.metrics?.pagesPerSession ?? 0;
          bValue = b.metrics?.pagesPerSession ?? 0;
          break;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });
  }, [sites, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-neutral-400" />;
    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="text-neutral-700 dark:text-neutral-300" />
    ) : (
      <ArrowDown size={14} className="text-neutral-700 dark:text-neutral-300" />
    );
  };

  const totals = useMemo(() => {
    if (!sites || sites.length === 0) return null;

    const total = sites.reduce(
      (acc, site) => ({
        users: acc.users + (site.metrics?.users ?? 0),
        sessions: acc.sessions + (site.metrics?.sessions ?? 0),
        pageviews: acc.pageviews + (site.metrics?.pageviews ?? 0),
        sessionDuration: acc.sessionDuration + (site.metrics?.sessionDuration ?? 0),
        pagesPerSession: acc.pagesPerSession + (site.metrics?.pagesPerSession ?? 0),
        bounceRate: acc.bounceRate + (site.metrics?.bounceRate ?? 0),
        count: acc.count + 1,
      }),
      {
        users: 0,
        sessions: 0,
        pageviews: 0,
        sessionDuration: 0,
        pagesPerSession: 0,
        bounceRate: 0,
        count: 0,
      }
    );

    return {
      users: total.users,
      sessions: total.sessions,
      pageviews: total.pageviews,
      avgSessionDuration: total.sessionDuration / total.count,
      avgPagesPerSession: total.pagesPerSession / total.count,
      avgBounceRate: total.bounceRate / total.count,
    };
  }, [sites]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Pageviews</TableHead>
              <TableHead>Bounce Rate</TableHead>
              <TableHead>Avg Duration</TableHead>
              <TableHead>Pages/Session</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map(i => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!sites || sites.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 p-8 text-center">
        <p className="text-neutral-500">No sites available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                onClick={() => handleSort("domain")}
              >
                <div className="flex items-center gap-1">
                  Domain
                  <SortIcon field="domain" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                onClick={() => handleSort("users")}
              >
                <div className="flex items-center gap-1">
                  Users
                  <SortIcon field="users" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                onClick={() => handleSort("sessions")}
              >
                <div className="flex items-center gap-1">
                  Sessions
                  <SortIcon field="sessions" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                onClick={() => handleSort("pageviews")}
              >
                <div className="flex items-center gap-1">
                  Pageviews
                  <SortIcon field="pageviews" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                onClick={() => handleSort("bounceRate")}
              >
                <div className="flex items-center gap-1">
                  Bounce Rate
                  <SortIcon field="bounceRate" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                onClick={() => handleSort("sessionDuration")}
              >
                <div className="flex items-center gap-1">
                  Avg Duration
                  <SortIcon field="sessionDuration" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                onClick={() => handleSort("pagesPerSession")}
              >
                <div className="flex items-center gap-1">
                  Pages/Session
                  <SortIcon field="pagesPerSession" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSites.map(site => {
              const metrics = site.metrics;
              return (
                <TableRow
                  key={site.siteId}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
                >
                  <TableCell>
                    <Link href={`/${site.siteId}`} className="flex items-center gap-2 group">
                      <Favicon domain={site.domain} className="w-5 h-5" />
                      <span className="font-medium group-hover:underline">{site.domain}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{metrics?.users.toLocaleString() ?? "-"}</span>
                      {metrics && <MetricChange value={metrics.usersChange} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{metrics?.sessions.toLocaleString() ?? "-"}</span>
                      {metrics && <MetricChange value={metrics.sessionsChange} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{metrics?.pageviews.toLocaleString() ?? "-"}</span>
                      {metrics && <MetricChange value={metrics.pageviewsChange} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{metrics?.bounceRate.toFixed(1) ?? "-"}%</span>
                      {metrics && <MetricChange value={metrics.bounceRateChange} reverseColors />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{metrics ? formatDuration(metrics.sessionDuration) : "-"}</span>
                      {metrics && <MetricChange value={metrics.sessionDurationChange} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{metrics?.pagesPerSession.toFixed(2) ?? "-"}</span>
                      {metrics && <MetricChange value={metrics.pagesPerSessionChange} />}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Totals Row */}
            {totals && (
              <TableRow className="bg-neutral-100 dark:bg-neutral-800 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <TableCell>Total ({sites.length} sites)</TableCell>
                <TableCell>{totals.users.toLocaleString()}</TableCell>
                <TableCell>{totals.sessions.toLocaleString()}</TableCell>
                <TableCell>{totals.pageviews.toLocaleString()}</TableCell>
                <TableCell>{totals.avgBounceRate.toFixed(1)}%</TableCell>
                <TableCell>{formatDuration(totals.avgSessionDuration)}</TableCell>
                <TableCell>{totals.avgPagesPerSession.toFixed(2)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
