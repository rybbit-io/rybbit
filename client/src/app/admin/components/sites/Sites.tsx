"use client";

import { useMemo, useState } from "react";
import { useAdminSites, AdminSiteData } from "@/api/admin/getAdminSites";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { AdminTablePagination } from "../shared/AdminTablePagination";
import { SortableHeader } from "../shared/SortableHeader";
import { SearchInput } from "../shared/SearchInput";
import { ErrorAlert } from "../shared/ErrorAlert";
import { AdminLayout } from "../shared/AdminLayout";
import { GrowthChart } from "../shared/GrowthChart";
import Link from "next/link";
import { Favicon } from "../../../../components/Favicon";
import { parseUtcTimestamp } from "../../../../lib/dateTimeUtils";
import { formatter } from "../../../../lib/utils";

export function Sites() {
  const { data: sites, isLoading, isError } = useAdminSites();
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "eventsLast24Hours", desc: true }]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });

  // Filter sites based on search query
  const filteredSites = useMemo(() => {
    if (!sites) return [];

    return sites.filter(site => {
      const lowerSearchQuery = searchQuery.toLowerCase();
      return (
        site.domain.toLowerCase().includes(lowerSearchQuery) ||
        site.organizationOwnerEmail?.toLowerCase().includes(lowerSearchQuery)
      );
    });
  }, [sites, searchQuery]);

  // Define columns for the table
  const columns = useMemo<ColumnDef<AdminSiteData>[]>(
    () => [
      {
        accessorKey: "siteId",
        header: ({ column }) => <SortableHeader column={column}>Site ID</SortableHeader>,
        cell: ({ row }) => (
          <div>
            <Link href={`/${row.getValue("siteId")}`} target="_blank" className="hover:underline">
              {row.getValue("siteId")}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "domain",
        header: ({ column }) => <SortableHeader column={column}>Domain</SortableHeader>,
        cell: ({ row }) => (
          <div className="font-medium flex items-center gap-2">
            <Favicon domain={row.original.domain} className="w-5 h-5 shrink-0" />
            <Link href={`https://${row.original.domain}`} target="_blank" className="hover:underline">
              {row.getValue("domain")}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
        cell: ({ row }) => <div>{parseUtcTimestamp(row.getValue("createdAt")).toRelative()}</div>,
      },
      {
        accessorKey: "public",
        header: ({ column }) => <SortableHeader column={column}>Public</SortableHeader>,
        cell: ({ row }) => (
          <div>{row.getValue("public") ? <Badge>Public</Badge> : <Badge variant="outline">Private</Badge>}</div>
        ),
      },
      {
        accessorKey: "eventsLast24Hours",
        header: ({ column }) => <SortableHeader column={column}>Events (24h)</SortableHeader>,
        cell: ({ row }) => <div>{formatter(Number(row.getValue("eventsLast24Hours")))}</div>,
      },
      {
        accessorKey: "eventsLast30Days",
        header: ({ column }) => <SortableHeader column={column}>Events (30d)</SortableHeader>,
        cell: ({ row }) => <div>{formatter(Number(row.getValue("eventsLast30Days")))}</div>,
      },
      {
        id: "subscription",
        header: ({ column }) => <SortableHeader column={column}>Subscription</SortableHeader>,
        accessorFn: row => row.subscription.planName,
        cell: ({ row }) => {
          const subscription = row.original.subscription;
          const statusColor =
            subscription.status === "active"
              ? "default"
              : subscription.status === "canceled"
                ? "destructive"
                : "secondary";
          return <Badge variant={statusColor}>{subscription.planName}</Badge>;
        },
      },
      {
        accessorKey: "organizationOwnerEmail",
        header: ({ column }) => <SortableHeader column={column}>Owner Email</SortableHeader>,
        cell: ({ row }) => <div>{row.getValue("organizationOwnerEmail") || "-"}</div>,
      },
    ],
    []
  );

  // Initialize the table
  const table = useReactTable({
    data: filteredSites,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  if (isError) {
    return (
      <AdminLayout>
        <ErrorAlert message="Failed to load sites data. Please try again later." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <GrowthChart data={sites} title="Sites" color="#10b981" />

      <div className="mb-4">
        <SearchInput placeholder="Search by domain or owner email..." value={searchQuery} onChange={setSearchQuery} />
      </div>

      <div className="rounded-md border border-neutral-100 dark:border-neutral-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
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
                      <Skeleton className="h-5 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
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
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                  </TableRow>
                ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                  {searchQuery ? "No sites match your search" : "No sites found"}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <AdminTablePagination
          table={table}
          data={filteredSites ? { items: filteredSites, total: filteredSites.length } : undefined}
          pagination={pagination}
          setPagination={setPagination}
          isLoading={isLoading}
          itemName="sites"
        />
      </div>
    </AdminLayout>
  );
}
