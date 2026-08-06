"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import { AdminOrganizationData } from "@/api/admin/endpoints";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { parseUtcTimestamp } from "@/lib/dateTimeUtils";
import { cn, formatter } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
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
import { TableShell } from "../shared/Panel";
import { OrganizationExpandedRow } from "./OrganizationExpandedRow";
import { useExtracted } from "next-intl";

interface OrganizationsTableProps {
  organizations: AdminOrganizationData[];
  isLoading: boolean;
  searchQuery: string;
}

type ColumnAlignMeta = { align?: "right" };

const SKELETON_CELLS: Array<{ width: string; right?: boolean }> = [
  { width: "w-4" },
  { width: "w-32" },
  { width: "w-24" },
  { width: "w-20", right: true },
  { width: "w-16", right: true },
  { width: "w-16", right: true },
  { width: "w-20" },
  { width: "w-8", right: true },
  { width: "w-8", right: true },
];

export function OrganizationsTable({ organizations, isLoading, searchQuery }: OrganizationsTableProps) {
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([{ id: "monthlyEventCount", desc: true }]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });

  const toggleExpand = useCallback((orgId: string) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  }, []);

  const formatSubscriptionStatus = (subscription: AdminOrganizationData["subscription"]) => {
    const variant =
      subscription.status === "canceled"
        ? ("destructive" as const)
        : subscription.status === "active" || subscription.status === "trialing"
          ? ("default" as const)
          : ("secondary" as const);
    return <Badge variant={variant}>{subscription.planName}</Badge>;
  };

  const columns = useMemo<ColumnDef<AdminOrganizationData>[]>(
    () => [
      {
        id: "expand",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            aria-expanded={expandedOrgs.has(row.original.id)}
            aria-label={t("Toggle details")}
            onClick={e => {
              e.stopPropagation();
              toggleExpand(row.original.id);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-sm text-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:hover:text-neutral-100"
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", expandedOrgs.has(row.original.id) && "rotate-90")}
            />
          </button>
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
        cell: ({ row }) => (
          <div className="text-neutral-600 dark:text-neutral-300">
            {formatRelative(parseUtcTimestamp(row.getValue("createdAt")))}
          </div>
        ),
      },
      {
        accessorKey: "monthlyEventCount",
        meta: { align: "right" } satisfies ColumnAlignMeta,
        header: ({ column }) => <SortableHeader column={column}>{t("Monthly Events")}</SortableHeader>,
        cell: ({ row }) => {
          const count = row.getValue("monthlyEventCount") as number;
          const isOverLimit = row.original.overMonthlyLimit;
          const limit = row.original.subscription.eventLimit;
          return (
            <div className={cn("tabular-nums", isOverLimit && "font-medium text-red-500 dark:text-red-400")}>
              {formatter(count || 0)}
              {isOverLimit && limit ? (
                <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">/ {formatter(limit)}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "eventsLast24Hours",
        meta: { align: "right" } satisfies ColumnAlignMeta,
        header: ({ column }) => <SortableHeader column={column}>{t("24h Events")}</SortableHeader>,
        accessorFn: row => row.sites.reduce((total, site) => total + Number(site.eventsLast24Hours || 0), 0),
        cell: ({ getValue }) => <span className="tabular-nums">{formatter(getValue<number>())}</span>,
      },
      {
        id: "eventsLast30Days",
        meta: { align: "right" } satisfies ColumnAlignMeta,
        header: ({ column }) => <SortableHeader column={column}>{t("30d Events")}</SortableHeader>,
        accessorFn: row => row.sites.reduce((total, site) => total + Number(site.eventsLast30Days || 0), 0),
        cell: ({ getValue }) => <span className="tabular-nums">{formatter(getValue<number>())}</span>,
      },
      {
        id: "subscription",
        header: ({ column }) => <SortableHeader column={column}>{t("Subscription")}</SortableHeader>,
        accessorFn: row => row.subscription.planName,
        cell: ({ row }) => formatSubscriptionStatus(row.original.subscription),
      },
      {
        id: "sites",
        meta: { align: "right" } satisfies ColumnAlignMeta,
        header: ({ column }) => <SortableHeader column={column}>{t("Sites")}</SortableHeader>,
        accessorFn: row => row.sites.length,
        cell: ({ row }) => <span className="tabular-nums">{row.original.sites.length}</span>,
      },
      {
        id: "members",
        meta: { align: "right" } satisfies ColumnAlignMeta,
        header: ({ column }) => <SortableHeader column={column}>{t("Members")}</SortableHeader>,
        accessorFn: row => row.members.length,
        cell: ({ row }) => <span className="tabular-nums">{row.original.members.length}</span>,
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
      <TableShell>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.id === "expand" && "w-8",
                      (header.column.columnDef.meta as ColumnAlignMeta | undefined)?.align === "right" && "text-right"
                    )}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(10)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={index}>
                    {SKELETON_CELLS.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className={cn("h-5", cell.width, cell.right && "ml-auto")} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
            ) : paginatedOrganizations && paginatedOrganizations.length > 0 ? (
              paginatedOrganizations.map(row => (
                <Fragment key={row.id}>
                  <TableRow className="cursor-pointer" onClick={() => toggleExpand(row.original.id)}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          (cell.column.columnDef.meta as ColumnAlignMeta | undefined)?.align === "right" &&
                            "text-right"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedOrgs.has(row.original.id) && (
                    <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                      <TableCell
                        colSpan={columns.length}
                        className="bg-neutral-50 px-8 py-4 dark:bg-neutral-950/40"
                      >
                        <OrganizationExpandedRow organization={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {searchQuery ? t("No organizations match your search") : t("No organizations found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableShell>
      <div className="mt-3">
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
