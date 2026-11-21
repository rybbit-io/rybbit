"use client";

import { useDeleteFeatureFlag, useUpdateFeatureFlag } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import type { FeatureFlag, FeatureFlagConditionSet } from "@/api/analytics/endpoints";
import { CopyButton } from "@/components/interior/copy-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Fragment, useRef, useState } from "react";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { formatFlagValue, getConditionSetPayload } from "../lib/form";
import { useFlagTypeLabel, useRuntimeLabel } from "../lib/labels";
import { FeatureFlagDialog } from "./FeatureFlagDialog";
import { SplitBar } from "./formParts";

const columnHelper = createColumnHelper<FeatureFlag>();
const totalSessions = (flag: FeatureFlag) => flag.stats.reduce((sum, stat) => sum + stat.sessions, 0);
const totalRules = (flag: FeatureFlag) =>
  flag.conditionSets.reduce((sum, conditionSet) => sum + conditionSet.rules.length, 0);

// Sort key only. The cell shows every condition, since the first one alone can say 100% while the
// catch-all below it serves 25%.
const computeRollout = (flag: FeatureFlag) => {
  if (flag.flagType !== "boolean") return -1;
  if (flag.conditionSets.length === 0) return flag.rolloutPercentage;
  return Math.max(...flag.conditionSets.map(conditionSet => conditionSet.rolloutPercentage ?? flag.rolloutPercentage));
};

// Cells that truncate report no width of their own, so the table would squeeze them to nothing.
const COLUMN_MIN_WIDTHS: Record<string, string> = { sessions: "9rem", updatedAt: "8rem" };
const MAX_CONDITIONS_SHOWN = 3;
const MAX_STATS_SHOWN = 3;
const EMPTY_CELL = <span className="text-neutral-400 dark:text-neutral-500">-</span>;

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
  const topStats = flag.stats.slice(0, MAX_STATS_SHOWN);
  if (topStats.length === 0) return EMPTY_CELL;

  return (
    <div className="grid w-fit grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs">
      {topStats.map(stat => (
        <Fragment key={stat.flag_value}>
          <span className="max-w-28 truncate font-mono text-neutral-600 dark:text-neutral-300">
            {stat.flag_value || "(empty)"}
          </span>
          <span className="text-right tabular-nums text-neutral-900 dark:text-neutral-100">
            {stat.sessions.toLocaleString()}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** What one condition serves: a share of visitors, a split across variants, or a payload. */
function ConditionServes({ flag, conditionSet }: { flag: FeatureFlag; conditionSet?: FeatureFlagConditionSet }) {
  if (flag.flagType === "remote_config") {
    const payload = formatFlagValue(getConditionSetPayload(flag, conditionSet));
    return payload ? (
      <span className="block max-w-56 truncate font-mono text-xs text-neutral-600 dark:text-neutral-300">
        {payload}
      </span>
    ) : (
      EMPTY_CELL
    );
  }

  if (flag.flagType === "multivariate") {
    const variants = conditionSet?.variants?.length ? conditionSet.variants : flag.variants;
    if (variants.length === 0) return EMPTY_CELL;
    const split = variants.map(variant => `${variant.key} ${variant.rolloutPercentage}%`).join(" · ");
    return (
      <div className="grid w-56 gap-1">
        <SplitBar
          segments={variants.map(variant => ({
            key: variant.key,
            label: variant.key,
            percent: variant.rolloutPercentage,
          }))}
        />
        <span className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-300" title={split}>
          {split}
        </span>
      </div>
    );
  }

  const rollout = conditionSet?.rolloutPercentage ?? flag.rolloutPercentage;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-150 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-neutral-700 dark:bg-neutral-200" style={{ width: `${rollout}%` }} />
      </div>
      <span className="tabular-nums">{rollout}%</span>
    </div>
  );
}

function FlagRollout({ flag }: { flag: FeatureFlag }) {
  const t = useExtracted();
  const conditionSets = flag.conditionSets;

  if (conditionSets.length <= 1) return <ConditionServes flag={flag} conditionSet={conditionSets[0]} />;

  const shown = conditionSets.slice(0, MAX_CONDITIONS_SHOWN);
  return (
    <div className="grid w-fit grid-cols-[auto_auto] items-center gap-x-3 gap-y-1.5">
      {shown.map((conditionSet, index) => (
        <Fragment key={index}>
          <span className="max-w-28 truncate text-xs text-neutral-500 dark:text-neutral-400">
            {conditionSet.name || t("Condition {number}", { number: String(index + 1) })}
          </span>
          <ConditionServes flag={flag} conditionSet={conditionSet} />
        </Fragment>
      ))}
      {conditionSets.length > shown.length && (
        <span className="col-span-2 text-xs text-neutral-500 dark:text-neutral-400">
          {t("+{count} more", { count: String(conditionSets.length - shown.length) })}
        </span>
      )}
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
            {/* A plain Button, not AlertDialogAction, so the dialog stays open until the request settles
                (handleDelete closes it on success). `loading` keeps its width while pending. */}
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              loadingLabel={t("Deleting...")}
              onClick={() => void handleDelete()}
            >
              {t("Delete flag")}
            </Button>
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
    <div className="grid max-w-80 gap-0.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{flag.key}</span>
        <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">v{flag.version}</span>
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
      {flag.description && (
        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{flag.description}</span>
      )}
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
  const getFlagTypeLabel = useFlagTypeLabel();
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
      return EMPTY_CELL;
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
        // The switch is its own label; without flags:write the state is spelled out instead.
        return canWrite ? (
          <Switch
            checked={flag.enabled}
            disabled={updateMutation.isPending}
            aria-label={t("Enabled")}
            onCheckedChange={enabled => updateMutation.mutate({ flagId: flag.flagId, payload: { enabled } })}
          />
        ) : (
          <span className={cn(!flag.enabled && "text-neutral-500 dark:text-neutral-400")}>
            {flag.enabled ? t("On") : t("Off")}
          </span>
        );
      },
      sortingFn: (a, b) => Number(b.original.enabled) - Number(a.original.enabled),
    }),
    columnHelper.accessor("flagType", {
      id: "type",
      header: ({ column }) => <SortHeader column={column}>{t("Type")}</SortHeader>,
      cell: info => <span className="whitespace-nowrap">{getFlagTypeLabel(info.getValue())}</span>,
    }),
    columnHelper.accessor("runtime", {
      id: "runtime",
      header: ({ column }) => <SortHeader column={column}>{t("Runtime")}</SortHeader>,
      cell: info => <span className="text-neutral-600 dark:text-neutral-300">{getRuntimeLabel(info.getValue())}</span>,
    }),
    columnHelper.accessor(row => computeRollout(row), {
      id: "rollout",
      header: ({ column }) => <SortHeader column={column}>{t("Rollout")}</SortHeader>,
      cell: info => <FlagRollout flag={info.row.original} />,
    }),
    columnHelper.accessor(row => totalRules(row), {
      id: "rules",
      header: ({ column }) => <SortHeader column={column}>{t("Targeting")}</SortHeader>,
      cell: info => {
        const rules = info.getValue();
        return rules === 0 ? (
          <span className="text-neutral-600 dark:text-neutral-300">{t("Everyone")}</span>
        ) : (
          <span className="whitespace-nowrap">
            {t("{count, plural, one {# rule} other {# rules}}", { count: rules })}
          </span>
        );
      },
    }),
    columnHelper.accessor(row => totalSessions(row), {
      id: "sessions",
      header: ({ column }) => <SortHeader column={column}>{t("Sessions")}</SortHeader>,
      cell: info => <FlagStats flag={info.row.original} />,
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
    <div className="overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
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
                      "h-8 whitespace-nowrap px-3 text-left align-middle text-xs font-medium text-neutral-500 dark:text-neutral-400",
                      header.id === "actions" && "w-12 text-right"
                    )}
                    style={{ minWidth: COLUMN_MIN_WIDTHS[header.id] }}
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
                  className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-850 dark:hover:bg-neutral-850/60"
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={cn("relative px-3 py-2.5", cell.column.id === "actions" && "text-right")}
                    >
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
