"use client";

import { adminMoveSite, AdminSiteData } from "@/api/admin/endpoints";
import { useAdminOrganizations } from "@/api/admin/hooks/useAdminOrganizations";
import { useAdminSites } from "@/api/admin/hooks/useAdminSites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Favicon } from "../../../../components/Favicon";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { parseUtcTimestamp } from "../../../../lib/dateTimeUtils";
import { formatter, truncateString } from "../../../../lib/utils";
import { AdminLayout } from "../shared/AdminLayout";
import { AdminTablePagination } from "../shared/AdminTablePagination";
import { ErrorAlert } from "../shared/ErrorAlert";
import { GrowthChart } from "../shared/GrowthChart";
import { SearchInput } from "../shared/SearchInput";
import { SortableHeader } from "../shared/SortableHeader";

function MoveSiteCell({ site }: { site: AdminSiteData }) {
  const t = useExtracted();
  const queryClient = useQueryClient();
  const { data: organizations } = useAdminOrganizations();
  const [open, setOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  const targets = (organizations ?? []).filter(org => org.id !== site.organizationId);

  const handleMove = async () => {
    if (!targetOrgId) return;
    try {
      setIsMoving(true);
      await adminMoveSite(site.siteId, targetOrgId);
      toast.success(t("Site moved successfully"));
      queryClient.invalidateQueries({ queryKey: ["admin-sites"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setTargetOrgId("");
      setOpen(false);
    } catch (error) {
      console.error("Error moving site:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to move site"));
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("Move")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Move Site")}</DialogTitle>
          <DialogDescription>
            {t(
              'Move "{siteName}" to another organization. Team and restricted member access for this site will be reset.',
              { siteName: site.name }
            )}
          </DialogDescription>
        </DialogHeader>
        <Select value={targetOrgId} onValueChange={setTargetOrgId}>
          <SelectTrigger>
            <SelectValue placeholder={t("Select an organization")} />
          </SelectTrigger>
          <SelectContent>
            {targets.map(org => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isMoving}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleMove} disabled={!targetOrgId || isMoving}>
            {isMoving ? t("Moving...") : t("Move site")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Sites() {
  const { data: sites, isLoading, isError } = useAdminSites();
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();
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
        site.name.toLowerCase().includes(lowerSearchQuery) ||
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
        header: ({ column }) => <SortableHeader column={column}>{t("Site ID")}</SortableHeader>,
        cell: ({ row }) => (
          <div>
            <Link href={`/${row.getValue("siteId")}`} target="_blank" className="hover:underline">
              {row.getValue("siteId")}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>{t("Name")}</SortableHeader>,
        cell: ({ row }) => (
          <div className="font-medium flex items-center gap-2">
            <Favicon domain={row.original.domain} className="w-5 h-5 shrink-0" />
            <Link href={`https://${row.original.domain}`} target="_blank" className="hover:underline">
              {truncateString(row.original.domain, 35)}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>{t("Created")}</SortableHeader>,
        cell: ({ row }) => <div>{formatRelative(parseUtcTimestamp(row.getValue("createdAt")))}</div>,
      },
      {
        accessorKey: "public",
        header: ({ column }) => <SortableHeader column={column}>{t("Public")}</SortableHeader>,
        cell: ({ row }) => (
          <div>
            {row.getValue("public") ? <Badge>{t("Public")}</Badge> : <Badge variant="outline">{t("Private")}</Badge>}
          </div>
        ),
      },
      {
        accessorKey: "eventsLast24Hours",
        header: ({ column }) => <SortableHeader column={column}>{t("Events (24h)")}</SortableHeader>,
        cell: ({ row }) => <div>{formatter(Number(row.getValue("eventsLast24Hours")))}</div>,
      },
      {
        accessorKey: "eventsLast30Days",
        header: ({ column }) => <SortableHeader column={column}>{t("Events (30d)")}</SortableHeader>,
        cell: ({ row }) => <div>{formatter(Number(row.getValue("eventsLast30Days")))}</div>,
      },
      {
        accessorKey: "goalsCount",
        header: ({ column }) => <SortableHeader column={column}>{t("Goals")}</SortableHeader>,
        cell: ({ row }) => <div>{row.getValue("goalsCount")}</div>,
      },
      {
        accessorKey: "funnelsCount",
        header: ({ column }) => <SortableHeader column={column}>{t("Funnels")}</SortableHeader>,
        cell: ({ row }) => <div>{row.getValue("funnelsCount")}</div>,
      },
      {
        accessorKey: "sessionReplay",
        header: ({ column }) => <SortableHeader column={column}>{t("Replay")}</SortableHeader>,
        cell: ({ row }) => (
          <div>
            {row.getValue("sessionReplay") ? <Badge>{t("On")}</Badge> : <Badge variant="outline">{t("Off")}</Badge>}
          </div>
        ),
      },
      {
        id: "subscription",
        header: ({ column }) => <SortableHeader column={column}>{t("Subscription")}</SortableHeader>,
        accessorFn: row => row.subscription.planName,
        cell: ({ row }) => {
          const subscription = row.original.subscription;
          const statusColor =
            subscription.status === "active" || subscription.status === "trialing"
              ? "default"
              : subscription.status === "canceled"
                ? "destructive"
                : "secondary";
          return <Badge variant={statusColor}>{subscription.planName}</Badge>;
        },
      },
      {
        accessorKey: "organizationOwnerEmail",
        header: ({ column }) => <SortableHeader column={column}>{t("Owner Email")}</SortableHeader>,
        cell: ({ row }) => <div>{row.getValue("organizationOwnerEmail") || "-"}</div>,
      },
      {
        id: "actions",
        header: () => <span>{t("Actions")}</span>,
        cell: ({ row }) => <MoveSiteCell site={row.original} />,
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
        <ErrorAlert message={t("Failed to load sites data. Please try again later.")} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <GrowthChart data={sites} title={t("Sites")} color="#10b981" />

      <div className="mb-4">
        <SearchInput
          placeholder={t("Search by domain or owner email...")}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

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
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                </TableRow>
              ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                {searchQuery ? t("No sites match your search") : t("No sites found")}
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
