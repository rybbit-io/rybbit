"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import { AdminOrganizationData } from "@/api/admin/endpoints";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { parseUtcTimestamp } from "@/lib/dateTimeUtils";
import { formatter } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { SortableHeader } from "../shared/SortableHeader";
import { OrganizationExpandedRow } from "./OrganizationExpandedRow";
import { useExtracted } from "next-intl";

interface OrganizationsTableProps {
  organizations: AdminOrganizationData[];
  isLoading: boolean;
  searchQuery: string;
}

export function OrganizationsTable({ organizations, isLoading, searchQuery }: OrganizationsTableProps) {
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();
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

  const formatSubscriptionStatus = (subscription: AdminOrganizationData["subscription"]) => {
    const statusColor =
      subscription.status === "active" || subscription.status === "trialing" ? "default" : subscription.status === "canceled" ? "destructive" : "secondary";
    return <Badge variant={statusColor}>{subscription.planName}</Badge>;
  };

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
        header: ({ column }) => <SortableHeader column={column}>{t("Organization")}</SortableHeader>,
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>{t("Created")}</SortableHeader>,
        cell: ({ row }) => <div>{formatRelative(parseUtcTimestamp(row.getValue("createdAt")))}</div>,
      },
      {
        accessorKey: "monthlyEventCount",
        header: ({ column }) => <SortableHeader column={column}>{t("Monthly Events")}</SortableHeader>,
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
        header: ({ column }) => <SortableHeader column={column}>{t("24h Events")}</SortableHeader>,
        accessorFn: row => row.sites.reduce((total, site) => total + Number(site.eventsLast24Hours || 0), 0),
        cell: ({ row }) => {
          const total = row.original.sites.reduce((sum, site) => sum + Number(site.eventsLast24Hours || 0), 0);
          return formatter(total);
        },
      },
      {
        id: "eventsLast30Days",
        header: ({ column }) => <SortableHeader column={column}>{t("30d Events")}</SortableHeader>,
        accessorFn: row => row.sites.reduce((total, site) => total + Number(site.eventsLast30Days || 0), 0),
        cell: ({ row }) => {
          const total = row.original.sites.reduce((sum, site) => sum + Number(site.eventsLast30Days || 0), 0);
          return formatter(total);
        },
      },
      {
        id: "subscription",
        header: ({ column }) => <SortableHeader column={column}>{t("Subscription")}</SortableHeader>,
        accessorFn: row => row.subscription.planName,
        cell: ({ row }) => formatSubscriptionStatus(row.original.subscription),
      },
      {
        id: "sites",
        header: ({ column }) => <SortableHeader column={column}>{t("Sites")}</SortableHeader>,
        accessorFn: row => row.sites.length,
        cell: ({ row }) => row.original.sites.length,
      },
      {
        id: "members",
        header: ({ column }) => <SortableHeader column={column}>{t("Members")}</SortableHeader>,
        accessorFn: row => row.members.length,
        cell: ({ row }) => row.original.members.length,
      },
    ],
    [toggleExpand, expandedOrgs]
  );

  const table = useReactTable({
    data: organizations || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false,
  });

  const paginatedOrganizations = table
    .getRowModel()
    .rows.slice(pagination.pageIndex * pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);

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

  return (
    <>
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
                <Fragment key={row.id}>
                  <TableRow className="group">
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                  {expandedOrgs.has(row.original.id) && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="bg-neutral-50 dark:bg-neutral-900 py-4 px-8">
                        <OrganizationExpandedRow organization={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                  {searchQuery ? t("No organizations match your search") : t("No organizations found")}
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
    </>
  );
}
