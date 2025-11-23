"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminOrganizations, AdminOrganizationData } from "@/api/admin/getAdminOrganizations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { parseUtcTimestamp } from "@/lib/dateTimeUtils";
import { formatter } from "@/lib/utils";
import { DateTime } from "luxon";
import {
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  CreditCard,
  UserCheck,
  ExternalLink,
  Activity,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { authClient } from "@/lib/auth";
import { userStore } from "@/lib/userStore";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { SortableHeader } from "../shared/SortableHeader";
import { SearchInput } from "../shared/SearchInput";
import { ErrorAlert } from "../shared/ErrorAlert";
import { AdminLayout } from "../shared/AdminLayout";
import { GrowthChart } from "../shared/GrowthChart";
import { OverviewCards } from "../shared/OverviewCards";
import { ServiceUsageChart } from "../shared/ServiceUsageChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CopyText } from "../../../../components/CopyText";

export function Organizations() {
  const router = useRouter();
  const { data: organizations, isLoading, isError } = useAdminOrganizations();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });

  // Filter states
  const [showZeroEvents, setShowZeroEvents] = useState(true);
  const [showFreeUsers, setShowFreeUsers] = useState(true);
  const [showOnlyOverLimit, setShowOnlyOverLimit] = useState(false);

  // Time period for service usage chart
  const [timePeriod, setTimePeriod] = useState<"30d" | "60d" | "120d" | "all">("30d");

  // Calculate date range based on time period
  const { startDate, endDate } = useMemo(() => {
    const now = DateTime.now();
    const end = now.toFormat("yyyy-MM-dd");

    if (timePeriod === "all") {
      // For all time, start from May 2025
      const start = "2025-05-01";
      return { startDate: start, endDate: end };
    }

    const days = timePeriod === "30d" ? 30 : timePeriod === "60d" ? 60 : 120;
    const start = now.minus({ days }).toFormat("yyyy-MM-dd");

    return { startDate: start, endDate: end };
  }, [timePeriod]);

  // Calculate stats from organizations data
  const stats = useMemo(() => {
    if (!organizations) {
      return {
        totalOrganizations: 0,
        activeOrganizations: 0,
        paidOrganizations: 0,
        totalEventsLast30Days: 0,
      };
    }

    const totalOrganizations = organizations.length;

    // Count organizations with at least 1 event in past 30 days
    const activeOrganizations = organizations.filter(org => org.sites.some(site => site.eventsLast30Days > 0)).length;

    // Count paid organizations (with a subscription)
    const paidOrganizations = organizations.filter(org => org.subscription.planName !== "free").length;

    // Sum all events from past 30 days
    const totalEventsLast30Days = organizations.reduce(
      (total, org) => total + org.sites.reduce((sum, site) => sum + Number(site.eventsLast30Days), 0),
      0
    );

    return {
      totalOrganizations,
      activeOrganizations,
      paidOrganizations,
      totalEventsLast30Days,
    };
  }, [organizations]);

  const toggleExpand = useCallback(
    (orgId: string) => {
      const newExpanded = new Set(expandedOrgs);
      if (newExpanded.has(orgId)) {
        newExpanded.delete(orgId);
      } else {
        newExpanded.add(orgId);
      }
      setExpandedOrgs(newExpanded);
    },
    [expandedOrgs]
  );

  // Filter organizations based on search query and filter toggles
  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];

    let filtered = organizations;

    // Apply search filter
    if (searchQuery.trim()) {
      const lowerSearchQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(org => {
        return (
          org.name.toLowerCase().includes(lowerSearchQuery) ||
          org.sites.some(site => site.domain.toLowerCase().includes(lowerSearchQuery)) ||
          org.members.some(
            member =>
              member.email.toLowerCase().includes(lowerSearchQuery) ||
              member.name.toLowerCase().includes(lowerSearchQuery)
          )
        );
      });
    }

    // Filter out organizations with 0 events in last 30 days
    if (!showZeroEvents) {
      filtered = filtered.filter(org => org.sites.some(site => site.eventsLast30Days > 0));
    }

    // Filter out free users
    if (!showFreeUsers) {
      filtered = filtered.filter(org => org.subscription.planName !== "free");
    }

    // Show only organizations over their event limit
    if (showOnlyOverLimit) {
      filtered = filtered.filter(org => org.overMonthlyLimit);
    }

    return filtered;
  }, [organizations, searchQuery, showZeroEvents, showFreeUsers, showOnlyOverLimit]);

  // Impersonation handler
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

  // Format subscription status
  const formatSubscriptionStatus = (subscription: AdminOrganizationData["subscription"]) => {
    if (!subscription.id) {
      return <Badge variant="secondary">Free</Badge>;
    }

    const statusColor =
      subscription.status === "active" ? "default" : subscription.status === "canceled" ? "destructive" : "secondary";

    return <Badge variant={statusColor}>{subscription.planName}</Badge>;
  };

  // Define columns for the table
  const columns = useMemo<ColumnDef<AdminOrganizationData>[]>(
    () => [
      {
        id: "expand",
        header: "",
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => toggleExpand(row.original.id)}>
            {expandedOrgs.has(row.original.id) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Organization</SortableHeader>,
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
        cell: ({ row }) => <div>{parseUtcTimestamp(row.getValue("createdAt")).toRelative()}</div>,
      },
      {
        accessorKey: "monthlyEventCount",
        header: ({ column }) => <SortableHeader column={column}>Monthly Events</SortableHeader>,
        cell: ({ row }) => {
          const count = row.getValue("monthlyEventCount") as number;
          const isOverLimit = row.original.overMonthlyLimit;
          return (
            <div className={`font-medium ${isOverLimit ? "text-red-400" : ""}`}>
              {formatter(count || 0)}
              {isOverLimit && <span className="text-red-400 ml-1">⚠️</span>}
            </div>
          );
        },
      },
      {
        id: "eventsLast24Hours",
        header: ({ column }) => <SortableHeader column={column}>24h Events</SortableHeader>,
        accessorFn: row => row.sites.reduce((total, site) => total + Number(site.eventsLast24Hours || 0), 0),
        cell: ({ row }) => {
          const total = row.original.sites.reduce((sum, site) => sum + Number(site.eventsLast24Hours || 0), 0);
          return formatter(total);
        },
      },
      {
        id: "eventsLast30Days",
        header: ({ column }) => <SortableHeader column={column}>30d Events</SortableHeader>,
        accessorFn: row => row.sites.reduce((total, site) => total + Number(site.eventsLast30Days || 0), 0),
        cell: ({ row }) => {
          const total = row.original.sites.reduce((sum, site) => sum + Number(site.eventsLast30Days || 0), 0);
          return formatter(total);
        },
      },
      {
        id: "subscription",
        header: ({ column }) => <SortableHeader column={column}>Subscription</SortableHeader>,
        accessorFn: row => row.subscription.planName,
        cell: ({ row }) => formatSubscriptionStatus(row.original.subscription),
      },
      {
        id: "sites",
        header: ({ column }) => <SortableHeader column={column}>Sites</SortableHeader>,
        accessorFn: row => row.sites.length,
        cell: ({ row }) => row.original.sites.length,
      },
      {
        id: "members",
        header: ({ column }) => <SortableHeader column={column}>Members</SortableHeader>,
        accessorFn: row => row.members.length,
        cell: ({ row }) => row.original.members.length,
      },
    ],
    [toggleExpand]
  );

  // Initialize the table
  const table = useReactTable({
    data: filteredOrganizations || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false,
  });

  // Paginate the sorted and filtered organizations
  const paginatedOrganizations = table
    .getRowModel()
    .rows.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);

  // Pagination controller for TablePagination
  const paginationController = {
    getState: () => ({ pagination }),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () =>
      table.getRowModel().rows.length > 0
        ? pagination.pageIndex < Math.ceil(table.getRowModel().rows.length / pagination.pageSize) - 1
        : false,
    getPageCount: () =>
      table.getRowModel().rows.length > 0 ? Math.ceil(table.getRowModel().rows.length / pagination.pageSize) : 0,
    setPageIndex: (index: number) => setPagination({ ...pagination, pageIndex: index }),
    previousPage: () =>
      setPagination({
        ...pagination,
        pageIndex: Math.max(0, pagination.pageIndex - 1),
      }),
    nextPage: () =>
      setPagination({
        ...pagination,
        pageIndex: Math.min(
          table.getRowModel().rows.length > 0
            ? Math.ceil(table.getRowModel().rows.length / pagination.pageSize) - 1
            : 0,
          pagination.pageIndex + 1
        ),
      }),
  };

  if (isError) {
    return (
      <AdminLayout>
        <ErrorAlert message="Failed to load organizations data. Please try again later." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <OverviewCards
        isLoading={isLoading}
        cards={[
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
            title: "Paid Organizations",
            value: stats.paidOrganizations,
            icon: CreditCard,
          },
          {
            title: "Total Events (30d)",
            value: stats.totalEventsLast30Days,
            icon: Zap,
          },
        ]}
      />

      <Tabs defaultValue="growth" className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="growth">Organization Growth</TabsTrigger>
            <TabsTrigger value="usage">Service Usage</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="growth">
          <GrowthChart data={organizations} color="#8b5cf6" title="Organizations" />
        </TabsContent>
        <TabsContent value="usage">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
            <Button
              size="sm"
              variant={timePeriod === "30d" ? "default" : "ghost"}
              onClick={() => setTimePeriod("30d")}
              className="h-7 text-xs"
            >
              30d
            </Button>
            <Button
              size="sm"
              variant={timePeriod === "60d" ? "default" : "ghost"}
              onClick={() => setTimePeriod("60d")}
              className="h-7 text-xs"
            >
              60d
            </Button>
            <Button
              size="sm"
              variant={timePeriod === "120d" ? "default" : "ghost"}
              onClick={() => setTimePeriod("120d")}
              className="h-7 text-xs"
            >
              120d
            </Button>
            <Button
              size="sm"
              variant={timePeriod === "all" ? "default" : "ghost"}
              onClick={() => setTimePeriod("all")}
              className="h-7 text-xs"
            >
              All Time
            </Button>
          </div>
          <ServiceUsageChart
            startDate={startDate}
            endDate={endDate}
            title={`Service-wide Usage - ${timePeriod === "all" ? "All Time" : `Last ${timePeriod}`}`}
          />
        </TabsContent>
      </Tabs>

      <div className="mb-4">
        <SearchInput
          placeholder="Search by name, slug, domain, or member email..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="flex items-center gap-6 mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Switch id="show-zero-events" checked={showZeroEvents} onCheckedChange={setShowZeroEvents} />
          <Label htmlFor="show-zero-events" className="text-sm cursor-pointer">
            Show orgs with 0 events (30d)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-free-users" checked={showFreeUsers} onCheckedChange={setShowFreeUsers} />
          <Label htmlFor="show-free-users" className="text-sm cursor-pointer">
            Show free users
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-only-over-limit" checked={showOnlyOverLimit} onCheckedChange={setShowOnlyOverLimit} />
          <Label htmlFor="show-only-over-limit" className="text-sm cursor-pointer">
            Only over limit
          </Label>
        </div>
      </div>

      <div className="rounded-md border border-neutral-100 dark:border-neutral-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className={header.id === "expand" ? "w-8" : ""}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(pagination.pageSize)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-5 w-5" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
            ) : paginatedOrganizations && paginatedOrganizations.length > 0 ? (
              paginatedOrganizations.map(row => (
                <>
                  <TableRow key={row.id} className="group">
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                  {expandedOrgs.has(row.original.id) && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="bg-neutral-50 dark:bg-neutral-900 py-4 px-8">
                        <div className="space-y-6">
                          {/* Subscription Details */}
                          <CopyText text={row.original.id}></CopyText>
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                              <CreditCard className="h-4 w-4" />
                              Subscription Details
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-neutral-100 dark:border-neutral-800 rounded">
                              <div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Plan</div>
                                <div className="font-medium">{row.original.subscription.planName}</div>
                              </div>
                              <div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Status</div>
                                <div className="font-medium">{row.original.subscription.status}</div>
                              </div>
                              <div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Event Limit</div>
                                <div className="font-medium">
                                  {row.original.subscription.eventLimit
                                    ? formatter(row.original.subscription.eventLimit)
                                    : "Unlimited"}
                                </div>
                              </div>
                              {row.original.subscription.currentPeriodEnd && (
                                <div>
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Period End</div>
                                  <div className="font-medium">
                                    {formatDistanceToNow(new Date(row.original.subscription.currentPeriodEnd), {
                                      addSuffix: true,
                                    })}
                                  </div>
                                </div>
                              )}
                              {row.original.subscription.cancelAtPeriodEnd && (
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
                              Sites ({row.original.sites.length})
                            </div>
                            {row.original.sites.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {row.original.sites.map(site => (
                                  <Link
                                    key={site.siteId}
                                    href={`/${site.siteId}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm transition-colors"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{site.domain}</span>
                                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {formatter(site.eventsLast24Hours)} events (24h) ·{" "}
                                        {formatter(site.eventsLast30Days)} (30d)
                                      </span>
                                    </div>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <div className="text-neutral-500 dark:text-neutral-400 p-4 border border-neutral-100 dark:border-neutral-800 rounded">No sites</div>
                            )}
                          </div>

                          {/* Members */}
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                              <User className="h-4 w-4" />
                              Members ({row.original.members.length})
                            </div>
                            {row.original.members.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {row.original.members.map(member => (
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
                              <div className="text-neutral-500 dark:text-neutral-400 p-4 border border-neutral-100 dark:border-neutral-800 rounded">No members</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                  {searchQuery ? "No organizations match your search" : "No organizations found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <Pagination
          table={paginationController}
          data={
            table.getRowModel().rows.length > 0
              ? {
                  items: table.getRowModel().rows,
                  total: table.getRowModel().rows.length,
                }
              : undefined
          }
          pagination={pagination}
          setPagination={setPagination}
          isLoading={isLoading}
          itemName="organizations"
        />
      </div>
    </AdminLayout>
  );
}
