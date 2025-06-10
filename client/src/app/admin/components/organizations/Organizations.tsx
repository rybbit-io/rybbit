"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useAdminOrganizations,
  AdminOrganizationData,
} from "@/api/admin/getAdminOrganizations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  CreditCard,
  UserCheck,
  ExternalLink,
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

  // Filter organizations based on search query
  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];

    if (!searchQuery.trim()) return organizations;

    const lowerSearchQuery = searchQuery.toLowerCase();
    return organizations.filter((org) => {
      return (
        org.name.toLowerCase().includes(lowerSearchQuery) ||
        org.sites.some((site) =>
          site.domain.toLowerCase().includes(lowerSearchQuery)
        ) ||
        org.members.some(
          (member) =>
            member.email.toLowerCase().includes(lowerSearchQuery) ||
            member.name.toLowerCase().includes(lowerSearchQuery)
        )
      );
    });
  }, [organizations, searchQuery]);

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
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error(`Failed to impersonate user: ${errorMessage}`);
        return false;
      }
    },
    [router]
  );

  // Format subscription status
  const formatSubscriptionStatus = (
    subscription: AdminOrganizationData["subscription"]
  ) => {
    if (!subscription.id) {
      return <Badge variant="secondary">Free</Badge>;
    }

    const statusColor =
      subscription.status === "active"
        ? "default"
        : subscription.status === "canceled"
        ? "destructive"
        : "secondary";

    return <Badge variant={statusColor}>{subscription.planName}</Badge>;
  };

  // Define columns for the table
  const columns = useMemo<ColumnDef<AdminOrganizationData>[]>(
    () => [
      {
        id: "expand",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={() => toggleExpand(row.original.id)}
          >
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
        header: ({ column }) => (
          <SortableHeader column={column}>Organization</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("name")}</div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <SortableHeader column={column}>Created</SortableHeader>
        ),
        cell: ({ row }) =>
          formatDistanceToNow(new Date(row.getValue("createdAt")), {
            addSuffix: true,
          }),
      },
      {
        accessorKey: "monthlyEventCount",
        header: ({ column }) => (
          <SortableHeader column={column}>Monthly Events</SortableHeader>
        ),
        cell: ({ row }) => {
          const count = row.getValue("monthlyEventCount") as number;
          const isOverLimit = row.original.overMonthlyLimit;
          return (
            <div className={`font-medium ${isOverLimit ? "text-red-400" : ""}`}>
              {count?.toLocaleString() || 0}
              {isOverLimit && <span className="text-red-400 ml-1">⚠️</span>}
            </div>
          );
        },
      },
      {
        id: "eventsLast24Hours",
        header: ({ column }) => (
          <SortableHeader column={column}>24h Events</SortableHeader>
        ),
        accessorFn: (row) =>
          row.sites.reduce(
            (total, site) => total + Number(site.eventsLast24Hours || 0),
            0
          ),
        cell: ({ row }) => {
          const total = row.original.sites.reduce(
            (sum, site) => sum + Number(site.eventsLast24Hours || 0),
            0
          );
          return total.toLocaleString();
        },
      },
      {
        id: "subscription",
        header: ({ column }) => (
          <SortableHeader column={column}>Subscription</SortableHeader>
        ),
        accessorFn: (row) => row.subscription.planName,
        cell: ({ row }) => formatSubscriptionStatus(row.original.subscription),
      },
      {
        id: "sites",
        header: ({ column }) => (
          <SortableHeader column={column}>Sites</SortableHeader>
        ),
        accessorFn: (row) => row.sites.length,
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.sites.length}</Badge>
        ),
      },
      {
        id: "members",
        header: ({ column }) => (
          <SortableHeader column={column}>Members</SortableHeader>
        ),
        accessorFn: (row) => row.members.length,
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.members.length}</Badge>
        ),
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
    .rows.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );

  // Pagination controller for TablePagination
  const paginationController = {
    getState: () => ({ pagination }),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () =>
      table.getRowModel().rows.length > 0
        ? pagination.pageIndex <
          Math.ceil(table.getRowModel().rows.length / pagination.pageSize) - 1
        : false,
    getPageCount: () =>
      table.getRowModel().rows.length > 0
        ? Math.ceil(table.getRowModel().rows.length / pagination.pageSize)
        : 0,
    setPageIndex: (index: number) =>
      setPagination({ ...pagination, pageIndex: index }),
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
            ? Math.ceil(table.getRowModel().rows.length / pagination.pageSize) -
                1
            : 0,
          pagination.pageIndex + 1
        ),
      }),
  };

  if (isError) {
    return (
      <AdminLayout title="Organizations">
        <ErrorAlert message="Failed to load organizations data. Please try again later." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Organizations">
      <div className="mb-4">
        <SearchInput
          placeholder="Search by name, slug, domain, or member email..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="rounded-md border border-neutral-700">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.id === "expand" ? "w-8" : ""}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
            ) : paginatedOrganizations && paginatedOrganizations.length > 0 ? (
              paginatedOrganizations.map((row) => (
                <>
                  <TableRow key={row.id} className="group">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedOrgs.has(row.original.id) && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="bg-neutral-900 py-4 px-8"
                      >
                        <div className="space-y-6">
                          {/* Subscription Details */}
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                              <CreditCard className="h-4 w-4" />
                              Subscription Details
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-neutral-700 rounded">
                              <div>
                                <div className="text-xs text-neutral-400 uppercase tracking-wide">
                                  Plan
                                </div>
                                <div className="font-medium">
                                  {row.original.subscription.planName}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-neutral-400 uppercase tracking-wide">
                                  Status
                                </div>
                                <div className="font-medium">
                                  {row.original.subscription.status}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-neutral-400 uppercase tracking-wide">
                                  Event Limit
                                </div>
                                <div className="font-medium">
                                  {row.original.subscription.eventLimit?.toLocaleString() ||
                                    "Unlimited"}
                                </div>
                              </div>
                              {row.original.subscription.currentPeriodEnd && (
                                <div>
                                  <div className="text-xs text-neutral-400 uppercase tracking-wide">
                                    Period End
                                  </div>
                                  <div className="font-medium">
                                    {formatDistanceToNow(
                                      new Date(
                                        row.original.subscription.currentPeriodEnd
                                      ),
                                      {
                                        addSuffix: true,
                                      }
                                    )}
                                  </div>
                                </div>
                              )}
                              {row.original.subscription.cancelAtPeriodEnd && (
                                <div>
                                  <div className="text-xs text-neutral-400 uppercase tracking-wide">
                                    Cancellation
                                  </div>
                                  <div className="font-medium text-orange-400">
                                    Cancels at period end
                                  </div>
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
                                {row.original.sites.map((site) => (
                                  <Link
                                    key={site.siteId}
                                    href={`/${site.siteId}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-md text-sm transition-colors"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {site.domain}
                                      </span>
                                      <span className="text-xs text-neutral-400">
                                        {site.eventsLast24Hours.toLocaleString()}{" "}
                                        events (24h)
                                      </span>
                                    </div>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <div className="text-neutral-400 p-4 border border-neutral-700 rounded">
                                No sites
                              </div>
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
                                {row.original.members.map((member) => (
                                  <div
                                    key={member.userId}
                                    className="p-3 border border-neutral-700 rounded flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {member.name}
                                      </div>
                                      <div className="text-sm text-neutral-400">
                                        {member.email}
                                      </div>
                                      <div className="text-xs text-neutral-500 mt-1">
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {member.role}
                                        </Badge>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() =>
                                        handleImpersonate(member.userId)
                                      }
                                      size="sm"
                                      variant="outline"
                                      className="flex items-center gap-1"
                                      disabled={
                                        member.userId ===
                                        userStore.getState().user?.id
                                      }
                                    >
                                      <UserCheck className="h-3 w-3" />
                                      Impersonate
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-neutral-400 p-4 border border-neutral-700 rounded">
                                No members
                              </div>
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
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-6 text-muted-foreground"
                >
                  {searchQuery
                    ? "No organizations match your search"
                    : "No organizations found"}
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
