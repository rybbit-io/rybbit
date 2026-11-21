"use client";

import { AdminApiKeyData } from "@/api/admin/endpoints";
import { useAdminApiKeys, useDeleteAdminApiKey, useUpdateAdminApiKey } from "@/api/admin/hooks/useAdminApiKeys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { Pagination } from "../../../../components/pagination";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { parseUtcTimestamp } from "../../../../lib/dateTimeUtils";
import { cn } from "../../../../lib/utils";
import { PermissionsSummary } from "../../../settings/account/components/ApiKeyManager";
import { ErrorAlert } from "../shared/ErrorAlert";
import { TableShell } from "../shared/Panel";
import { SearchInput } from "../shared/SearchInput";
import { SortableHeader } from "../shared/SortableHeader";
import { StatStrip } from "../shared/StatStrip";

type KeyStatus = "active" | "disabled" | "expired";
type OwnerFilter = "all" | AdminApiKeyData["ownerType"];
type StatusFilter = "all" | KeyStatus;

const MUTED = "text-neutral-500 dark:text-neutral-400";
const SKELETON_WIDTHS = ["w-28", "w-20", "w-40", "w-28", "w-24", "w-20", "w-20", "w-16", "w-16"];

function keyStatus(key: AdminApiKeyData, now: DateTime): KeyStatus {
  if (!key.enabled) return "disabled";
  if (key.expiresAt && parseUtcTimestamp(key.expiresAt) <= now) return "expired";
  return "active";
}

function StatusBadge({ status }: { status: KeyStatus }) {
  const t = useExtracted();
  if (status === "disabled") return <Badge variant="destructive">{t("Disabled")}</Badge>;
  if (status === "expired") return <Badge variant="warning">{t("Expired")}</Badge>;
  return <Badge variant="success">{t("Active")}</Badge>;
}

function OwnerCell({ apiKey }: { apiKey: AdminApiKeyData }) {
  const t = useExtracted();
  const isOrg = apiKey.ownerType === "organization";

  if (!apiKey.ownerName) {
    return (
      <div className="min-w-0">
        <div className={cn("italic", MUTED)}>{isOrg ? t("Deleted organization") : t("Deleted user")}</div>
        <div className={cn("font-mono text-xs", MUTED)}>{apiKey.ownerId}</div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="truncate font-medium">{apiKey.ownerName}</span>
        <Badge variant={isOrg ? "info" : "outline"} className="shrink-0">
          {isOrg ? t("Org") : t("User")}
        </Badge>
      </div>
      <div className={cn("truncate text-xs", MUTED)}>
        {isOrg
          ? apiKey.createdBy
            ? t("Created by {creator}", {
                creator: apiKey.createdBy.email ?? apiKey.createdBy.name ?? apiKey.createdBy.id,
              })
            : apiKey.ownerId
          : apiKey.ownerEmail}
      </div>
    </div>
  );
}

function EnabledSwitch({ apiKey }: { apiKey: AdminApiKeyData }) {
  const t = useExtracted();
  const updateKey = useUpdateAdminApiKey();
  const label = apiKey.name || t("Unnamed");

  return (
    <Switch
      checked={apiKey.enabled}
      disabled={updateKey.isPending}
      aria-label={
        apiKey.enabled ? t("Disable API key {name}", { name: label }) : t("Enable API key {name}", { name: label })
      }
      onCheckedChange={enabled =>
        updateKey.mutate(
          { keyId: apiKey.id, enabled },
          {
            onSuccess: () => toast.success(enabled ? t("API key enabled") : t("API key disabled")),
            onError: error => toast.error(error instanceof Error ? error.message : t("Failed to update API key")),
          }
        )
      }
    />
  );
}

export function ApiKeys() {
  const t = useExtracted();
  const { formatRelative, formatDateTime } = useDateTimeFormat();
  const { data: keys, isLoading, isError } = useAdminApiKeys();
  const deleteKey = useDeleteAdminApiKey();
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<AdminApiKeyData | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  // Fixed per data load so status and the 7-day window don't drift between renders.
  const now = useMemo(() => DateTime.now(), [keys]);

  const stats = useMemo(() => {
    const all = keys ?? [];
    const weekAgo = now.minus({ days: 7 });
    return [
      { label: t("Total keys"), value: all.length.toLocaleString() },
      {
        label: t("Organization keys"),
        value: all.filter(key => key.ownerType === "organization").length.toLocaleString(),
      },
      {
        label: t("Disabled or expired"),
        value: all.filter(key => keyStatus(key, now) !== "active").length.toLocaleString(),
      },
      {
        label: t("Used in last 7 days"),
        value: all
          .filter(key => key.lastRequest && parseUtcTimestamp(key.lastRequest) >= weekAgo)
          .length.toLocaleString(),
      },
    ];
  }, [keys, now, t]);

  const filteredKeys = useMemo(() => {
    if (!keys) return [];
    const query = searchQuery.trim().toLowerCase();
    return keys.filter(key => {
      if (ownerFilter !== "all" && key.ownerType !== ownerFilter) return false;
      if (statusFilter !== "all" && keyStatus(key, now) !== statusFilter) return false;
      if (!query) return true;
      return [key.name, key.start, key.id, key.ownerId, key.ownerName, key.ownerEmail, key.createdBy?.email].some(
        value => value?.toLowerCase().includes(query)
      );
    });
  }, [keys, searchQuery, ownerFilter, statusFilter, now]);

  const columns = useMemo<ColumnDef<AdminApiKeyData>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>{t("Name")}</SortableHeader>,
        cell: ({ row }) =>
          row.original.name ? (
            <span className="font-medium">{row.original.name}</span>
          ) : (
            <span className={cn("italic", MUTED)}>{t("Unnamed")}</span>
          ),
      },
      {
        accessorKey: "start",
        header: () => <span>{t("Key")}</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-neutral-600 dark:text-neutral-400">
            {row.original.start ? `${row.original.start}…` : "••••"}
          </span>
        ),
      },
      {
        id: "owner",
        accessorFn: row => row.ownerName ?? "",
        header: ({ column }) => <SortableHeader column={column}>{t("Owner")}</SortableHeader>,
        cell: ({ row }) => <OwnerCell apiKey={row.original} />,
      },
      {
        id: "permissions",
        header: () => <span>{t("Permissions")}</span>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            <PermissionsSummary permissions={row.original.permissions} />
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column}>{t("Created")}</SortableHeader>,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-neutral-600 dark:text-neutral-300">
            {formatRelative(parseUtcTimestamp(row.original.createdAt))}
          </span>
        ),
      },
      {
        accessorKey: "lastRequest",
        sortUndefined: "last",
        header: ({ column }) => <SortableHeader column={column}>{t("Last used")}</SortableHeader>,
        cell: ({ row }) =>
          row.original.lastRequest ? (
            <span className="whitespace-nowrap text-neutral-600 dark:text-neutral-300">
              {formatRelative(parseUtcTimestamp(row.original.lastRequest))}
            </span>
          ) : (
            <span className={MUTED}>{t("Never")}</span>
          ),
      },
      {
        accessorKey: "expiresAt",
        sortUndefined: "last",
        header: ({ column }) => <SortableHeader column={column}>{t("Expires")}</SortableHeader>,
        cell: ({ row }) =>
          row.original.expiresAt ? (
            <span className="whitespace-nowrap tabular-nums text-neutral-600 dark:text-neutral-300">
              {formatDateTime(parseUtcTimestamp(row.original.expiresAt), { dateStyle: "medium" })}
            </span>
          ) : (
            <span className={MUTED}>{t("Never")}</span>
          ),
      },
      {
        id: "status",
        accessorFn: row => keyStatus(row, now),
        header: ({ column }) => <SortableHeader column={column}>{t("Status")}</SortableHeader>,
        cell: ({ row }) => <StatusBadge status={keyStatus(row.original, now)} />,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("Actions")}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <EnabledSwitch apiKey={row.original} />
            <Button
              variant="ghost"
              size="smIcon"
              className="text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400"
              onClick={() => setPendingDelete(row.original)}
              aria-label={t("Delete API key {name}", { name: row.original.name || t("Unnamed") })}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [now, formatRelative, formatDateTime, t]
  );

  const table = useReactTable({
    data: filteredKeys,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isError) {
    return <ErrorAlert message={t("Failed to load API keys. Please try again later.")} />;
  }

  const isFiltered = !!searchQuery || ownerFilter !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <StatStrip stats={stats} isLoading={isLoading} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            placeholder={t("Search by name, key, owner, or email...")}
            value={searchQuery}
            onChange={value => {
              setSearchQuery(value);
              setPagination(prev => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full sm:w-auto sm:min-w-[280px]"
          />
          <Select
            value={ownerFilter}
            onValueChange={value => {
              setOwnerFilter(value as OwnerFilter);
              setPagination(prev => ({ ...prev, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="w-40" aria-label={t("Owner type")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All owners")}</SelectItem>
              <SelectItem value="user">{t("User keys")}</SelectItem>
              <SelectItem value="organization">{t("Organization keys")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={value => {
              setStatusFilter(value as StatusFilter);
              setPagination(prev => ({ ...prev, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="w-36" aria-label={t("Status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All statuses")}</SelectItem>
              <SelectItem value="active">{t("Active")}</SelectItem>
              <SelectItem value="disabled">{t("Disabled")}</SelectItem>
              <SelectItem value="expired">{t("Expired")}</SelectItem>
            </SelectContent>
          </Select>
          {!isLoading && isFiltered && (
            <span className={cn("text-sm tabular-nums", MUTED)}>
              {t("{count} matching", { count: filteredKeys.length.toLocaleString() })}
            </span>
          )}
        </div>

        <TableShell>
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
                Array.from({ length: 8 }, (_, index) => (
                  <TableRow key={index}>
                    {SKELETON_WIDTHS.map((width, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className={cn("h-5", width)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                    {isFiltered ? t("No API keys match your filters") : t("No API keys found")}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} className={cn(!row.original.enabled && "opacity-60")}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableShell>

        <Pagination
          table={table}
          data={{ items: filteredKeys, total: filteredKeys.length }}
          pagination={pagination}
          setPagination={setPagination}
          isLoading={isLoading}
          itemName="API keys"
        />
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" color="hsl(var(--red-500))" />
              {t("Delete this API key?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                '"{name}" ({owner}) will be revoked immediately and can\'t be restored. Anything still using it will stop working. Disable it instead if you may need it back.',
                {
                  name: pendingDelete?.name || t("Unnamed"),
                  owner: pendingDelete?.ownerName ?? pendingDelete?.ownerId ?? "",
                }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteKey.isPending}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteKey.isPending}
              onClick={e => {
                e.preventDefault();
                if (!pendingDelete) return;
                deleteKey.mutate(pendingDelete.id, {
                  onSuccess: () => {
                    toast.success(t("API key deleted"));
                    setPendingDelete(null);
                  },
                  onError: error => toast.error(error instanceof Error ? error.message : t("Failed to delete API key")),
                });
              }}
            >
              {deleteKey.isPending ? t("Deleting...") : t("Delete key")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
