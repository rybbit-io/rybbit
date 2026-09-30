"use client";

import { useDeleteFeatureFlag, useUpdateFeatureFlag } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import type { FeatureFlag } from "@/api/analytics/endpoints";
import { CopyButton } from "@/components/interior/copy-button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { TableSortIndicator } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getTimezone } from "@/lib/store";
import {
  type CellContext,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useRef, useState } from "react";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { formatFlagValue, getConditionSetPayload } from "../lib/form";
import { useFlagTypeLabel, useRuntimeLabel } from "../lib/labels";
import { FeatureFlagDialog } from "./FeatureFlagDialog";

const columnHelper = createColumnHelper<FeatureFlag>();
const TIME_COLUMN_IDS = new Set(["createdAt", "updatedAt"]);
const isTimeColumn = (columnId: string) => TIME_COLUMN_IDS.has(columnId);

const totalSessions = (flag: FeatureFlag) => flag.stats.reduce((sum, stat) => sum + stat.sessions, 0);
const totalRules = (flag: FeatureFlag) =>
  flag.conditionSets.reduce((sum, conditionSet) => sum + conditionSet.rules.length, 0);

const computeRollout = (flag: FeatureFlag) => {
  if (flag.flagType === "remote_config") return null;
  const firstConditionSet = flag.conditionSets[0];
  if (flag.flagType === "multivariate") {
    const variants = firstConditionSet?.variants || flag.variants;
    return Math.min(
      100,
      variants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0)
    );
  }
  return firstConditionSet?.rolloutPercentage ?? flag.rolloutPercentage;
};

const SortHeader = ({ column, children }: any) => {
  const isSorted = column.getIsSorted();
  return (
    <div
      onClick={() => column.toggleSorting(isSorted ? isSorted === "asc" : true)}
      className="flex cursor-pointer select-none items-center gap-1"
    >
      {children}
      <TableSortIndicator sortDirection={isSorted} />
    </div>
  );
};

function FlagStats({ flag }: { flag: FeatureFlag }) {
  const topStats = flag.stats.slice(0, 2);
  if (topStats.length === 0) return <span className="text-neutral-400">-</span>;

  return (
    <div className="flex flex-col gap-1">
      {topStats.map(stat => (
        <div key={`${stat.flag_value}-${stat.sessions}`} className="flex items-center gap-2 text-xs">
          <span className="max-w-24 truncate font-mono text-neutral-700 dark:text-neutral-200">
            {stat.flag_value || "(empty)"}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">{stat.sessions.toLocaleString()} sessions</span>
        </div>
      ))}
    </div>
  );
}

function FlagValueSummary({ flag }: { flag: FeatureFlag }) {
  const t = useExtracted();
  const getFlagTypeLabel = useFlagTypeLabel();
  const firstConditionSet = flag.conditionSets[0];
  const variants = firstConditionSet?.variants || flag.variants;

  if (flag.flagType === "multivariate") {
    return (
      <div className="flex max-w-56 flex-col gap-1">
        <Badge variant="outline" className="w-fit">
          {getFlagTypeLabel(flag.flagType)}
        </Badge>
        <div className="flex flex-wrap gap-1">
          {variants.slice(0, 3).map(variant => (
            <span
              key={variant.key}
              className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800"
            >
              {variant.key} {variant.rolloutPercentage}%
            </span>
          ))}
          {variants.length > 3 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">+{variants.length - 3}</span>
          )}
        </div>
      </div>
    );
  }

  if (flag.flagType === "remote_config") {
    return (
      <div className="flex max-w-48 flex-col gap-1">
        <Badge variant="outline" className="w-fit">
          {getFlagTypeLabel(flag.flagType)}
        </Badge>
        <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {formatFlagValue(getConditionSetPayload(flag, firstConditionSet)) || t("Payload")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex max-w-48 flex-col gap-1">
      <Badge variant="outline" className="w-fit">
        {getFlagTypeLabel(flag.flagType)}
      </Badge>
      {(firstConditionSet?.payload !== undefined || (flag.payload !== undefined && flag.payload !== null)) && (
        <span className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {formatFlagValue(getConditionSetPayload(flag, firstConditionSet))}
        </span>
      )}
    </div>
  );
}

function FlagRolloutSummary({ flag }: { flag: FeatureFlag }) {
  const rollout = computeRollout(flag);
  if (rollout === null) return <span className="text-neutral-400">-</span>;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn("h-2 rounded-full bg-accent-500", rollout === 0 && "bg-transparent")}
          style={{ width: `${rollout}%` }}
        />
      </div>
      <span className="text-sm tabular-nums">{rollout}%</span>
    </div>
  );
}

function RowActions({ flag }: { flag: FeatureFlag }) {
  const t = useExtracted();
  const deleteMutation = useDeleteFeatureFlag();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(flag.flagId);
      toast.success(t("Feature flag deleted"));
      setConfirmDelete(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to delete feature flag"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={actionsTriggerRef} size="smIcon" variant="ghost" aria-label={t("Actions")}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            {t("Edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={deleteMutation.isPending}
            onSelect={() => setConfirmDelete(true)}
            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FeatureFlagDialog flag={flag} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent
          onCloseAutoFocus={event => {
            // Back to the row's actions button, as window.confirm did.
            event.preventDefault();
            actionsTriggerRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete this feature flag?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('"{key}" will be permanently deleted. This cannot be undone.', { key: flag.key })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={event => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteMutation.isPending ? t("Deleting...") : t("Delete flag")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Cells with state are module-level components: flexRender mounts a cell function
// as a component, and the inline ones below are recreated on every table render,
// which would reset a copy check or close an open dialog.
function FlagKeyCell({ row }: CellContext<FeatureFlag, string>) {
  const t = useExtracted();
  const flag = row.original;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-medium">{flag.key}</span>
      <Badge variant="secondary">v{flag.version}</Badge>
      {/* Shown on row hover or focus where hover exists; always shown on touch screens. */}
      <CopyButton
        iconOnly
        size="xs"
        tooltip
        value={flag.key}
        label={t("Copy flag key")}
        className="-ml-1 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[status=copied]:opacity-100 data-[status=error]:opacity-100"
      />
    </div>
  );
}

function RowActionsCell({ row }: CellContext<FeatureFlag, unknown>) {
  return (
    <div className="flex justify-end">
      <RowActions flag={row.original} />
    </div>
  );
}

/** `canWrite` (flags:write) shows the on/off switch and the edit and delete actions; without it the table is read-only. */
export function FeatureFlagTable({ flags, canWrite }: { flags: FeatureFlag[]; canWrite: boolean }) {
  const t = useExtracted();
  const getRuntimeLabel = useRuntimeLabel();
  const updateMutation = useUpdateFeatureFlag();
  const { formatRelative, formatDateTime } = useDateTimeFormat();
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);

  const parseTimestamp = (value: string) => {
    const sql = DateTime.fromSQL(value, { zone: "utc" });
    const date = sql.isValid ? sql : DateTime.fromISO(value, { zone: "utc" });
    return date.setZone(getTimezone());
  };

  const renderTimeCell = (value: string) => {
    const date = parseTimestamp(value);
    if (!date.isValid) {
      return <span className="text-neutral-400">-</span>;
    }
    const formatted = formatDateTime(date, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const relative = formatRelative(date);
    return (
      <div className="grid w-32 whitespace-nowrap">
        <span className="col-start-1 row-start-1 text-neutral-600 group-hover:invisible dark:text-neutral-300">
          {relative}
        </span>
        <span className="invisible col-start-1 row-start-1 text-neutral-600 group-hover:visible dark:text-neutral-300">
          {formatted}
        </span>
      </div>
    );
  };

  const columns = [
    columnHelper.accessor("key", {
      id: "key",
      header: ({ column }) => <SortHeader column={column}>{t("Flag")}</SortHeader>,
      cell: FlagKeyCell,
    }),
    columnHelper.accessor("enabled", {
      id: "enabled",
      header: ({ column }) => <SortHeader column={column}>{t("Status")}</SortHeader>,
      cell: info => {
        const flag = info.row.original;
        return (
          <div className="flex items-center gap-2">
            {canWrite && (
              <Switch
                checked={flag.enabled}
                disabled={updateMutation.isPending}
                onCheckedChange={enabled => updateMutation.mutate({ flagId: flag.flagId, payload: { enabled } })}
              />
            )}
            <Badge variant={flag.enabled ? "success" : "secondary"}>{flag.enabled ? t("On") : t("Off")}</Badge>
            <Badge variant="outline">{getRuntimeLabel(flag.runtime)}</Badge>
          </div>
        );
      },
      sortingFn: (a, b) => Number(b.original.enabled) - Number(a.original.enabled),
    }),
    columnHelper.display({
      id: "value",
      header: () => <span>{t("Value")}</span>,
      cell: info => <FlagValueSummary flag={info.row.original} />,
    }),
    columnHelper.accessor(row => computeRollout(row) ?? -1, {
      id: "rollout",
      header: ({ column }) => <SortHeader column={column}>{t("Rollout")}</SortHeader>,
      cell: info => <FlagRolloutSummary flag={info.row.original} />,
    }),
    columnHelper.accessor(row => totalRules(row), {
      id: "rules",
      header: ({ column }) => <SortHeader column={column}>{t("Rules")}</SortHeader>,
      cell: info => {
        const flag = info.row.original;
        return (
          <span className="tabular-nums">
            {flag.conditionSets.length.toLocaleString()} / {totalRules(flag).toLocaleString()}
          </span>
        );
      },
    }),
    columnHelper.accessor(row => totalSessions(row), {
      id: "traffic",
      header: ({ column }) => <SortHeader column={column}>{t("Traffic")}</SortHeader>,
      cell: info => <FlagStats flag={info.row.original} />,
    }),
    columnHelper.accessor("createdAt", {
      id: "createdAt",
      header: ({ column }) => <SortHeader column={column}>{t("Created")}</SortHeader>,
      cell: info => renderTimeCell(info.getValue()),
    }),
    columnHelper.accessor("updatedAt", {
      id: "updatedAt",
      header: ({ column }) => <SortHeader column={column}>{t("Updated")}</SortHeader>,
      cell: info => renderTimeCell(info.getValue()),
    }),
    ...(canWrite
      ? [
          columnHelper.display({
            id: "actions",
            header: () => <span className="sr-only">{t("Actions")}</span>,
            cell: RowActionsCell,
          }),
        ]
      : []),
  ];

  const table = useReactTable({
    data: flags,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    sortDescFirst: true,
  });

  return (
    <div className="rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 [&_tr]:border-b-0 dark:bg-neutral-850">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      "h-8 whitespace-nowrap px-3 text-left align-middle text-xs font-medium text-neutral-500 first:rounded-l-lg last:rounded-r-lg dark:text-neutral-400",
                      header.id === "actions" && "w-12 text-right"
                    )}
                    style={{
                      minWidth: isTimeColumn(header.id) ? "8rem" : undefined,
                    }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-neutral-500 dark:text-neutral-400">
                  {t("No feature flags found")}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="group border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-850"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className={cn("relative p-3", cell.column.id === "actions" && "text-right")}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
