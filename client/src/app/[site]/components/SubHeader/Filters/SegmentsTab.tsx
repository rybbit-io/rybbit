"use client";

import { Segment } from "@rybbit/shared";
import { BookmarkPlus, Building2, Check, Eye, Layers, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useDeleteSegment, useGetSegments } from "../../../../../api/analytics/hooks/useSegments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../../components/ui/alert-dialog";
import { Button } from "../../../../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../../components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../../components/ui/dropdown-menu";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { toast } from "../../../../../components/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useGetRegionName } from "../../../../../lib/geo";
import { applySegment, clearSegment, useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import { isNumericParameter } from "./const";
import { formatDisplayValue, operatorNeedsValue, useOperatorLabel, useParameterLabel } from "./labels";
import { partitionFilters } from "./segmentUtils";

function useSegmentSummary() {
  const { getRegionName } = useGetRegionName();
  const getParameterLabel = useParameterLabel();
  const getOperatorLabel = useOperatorLabel();
  return (segment: Segment) =>
    segment.filters
      .map(filter => {
        const parts = [
          getParameterLabel(filter.parameter),
          getOperatorLabel(filter.type, isNumericParameter(filter.parameter)),
        ];
        if (operatorNeedsValue(filter.type)) parts.push(formatDisplayValue(filter, getRegionName));
        return parts.join(" ");
      })
      .join(" · ");
}

/**
 * The Segments tab of the Filter popover: every saved segment for this site,
 * click to apply, a row menu for edit and delete, and the two ways to make a
 * new one (from scratch, or from whatever filters are on the dashboard).
 */
export function SegmentsTab({
  siteId,
  canWrite,
  onNew,
  onSaveCurrent,
  onEdit,
  onApplied,
}: {
  siteId: string;
  /** False for public-dashboard and private-link viewers: no create, save, edit, or delete. */
  canWrite: boolean;
  onNew: () => void;
  onSaveCurrent: () => void;
  onEdit: (segment: Segment) => void;
  onApplied: () => void;
}) {
  const t = useExtracted();
  const { data: segments, isLoading } = useGetSegments(siteId);
  const { filters, segmentId } = useStore();
  const summarize = useSegmentSummary();
  const { mutate: deleteSegment, isPending: isDeleting } = useDeleteSegment();
  const [pendingDelete, setPendingDelete] = useState<Segment | null>(null);

  const active = segments?.find(segment => segment.segmentId === segmentId);
  const { adHoc } = partitionFilters(filters, active);
  const canSaveCurrent = canWrite && (active ? adHoc.length > 0 : filters.length > 0);

  const toggle = (segment: Segment) => {
    if (segment.segmentId === segmentId) {
      clearSegment(segment.filters);
    } else {
      applySegment(segment, active?.filters);
    }
    onApplied();
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteSegment(
      { siteId, segmentId: target.segmentId },
      {
        onSuccess: () => {
          if (target.segmentId === segmentId) clearSegment(target.filters);
          toast.success(t("Deleted segment “{name}”", { name: target.name }));
          setPendingDelete(null);
        },
        onError: error => {
          toast.error(error instanceof Error ? error.message : t("Failed to delete segment"));
          setPendingDelete(null);
        },
      }
    );
  };

  const footer = canWrite && (
    <div className="border-t border-neutral-200 dark:border-neutral-800 p-2 flex flex-col gap-1.5">
      {canSaveCurrent && (
        <Button size="sm" variant="success" className="w-full gap-1.5" onClick={onSaveCurrent}>
          <BookmarkPlus className="h-4 w-4" />
          {t("Save current filters as segment")}
        </Button>
      )}
      <Button size="sm" variant={canSaveCurrent ? "ghost" : "outline"} className="w-full gap-1.5" onClick={onNew}>
        <Plus className="h-4 w-4" />
        {t("New segment")}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div>
        <div className="px-4 py-6 text-center flex flex-col items-center gap-1.5">
          <Layers className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
          <div className="text-sm font-medium">{t("No segments yet")}</div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-[30ch]">
            {canWrite
              ? t("Save a set of filters to reuse it on any report with one click.")
              : t("The site owner has not shared any segments on this dashboard.")}
          </p>
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div>
      <Command>
        <CommandInput placeholder={t("Search segments")} />
        <CommandList>
          <CommandEmpty>{t("No results")}</CommandEmpty>
          <CommandGroup>
            {segments.map(segment => {
              const isActive = segment.segmentId === segmentId;
              return (
                <CommandItem
                  key={segment.segmentId}
                  value={`${segment.name} ${segment.segmentId}`}
                  onSelect={() => toggle(segment)}
                  className={cn("cursor-pointer items-start gap-2 py-2", isActive && "bg-neutral-100 dark:bg-neutral-800")}
                >
                  <Layers className="h-4 w-4 mt-0.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn("truncate", isActive && "font-medium")}>{segment.name}</span>
                      {segment.siteId === null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Building2 className="h-3 w-3 shrink-0 text-neutral-400 dark:text-neutral-500" />
                          </TooltipTrigger>
                          <TooltipContent>{t("Shared with every site in the organization")}</TooltipContent>
                        </Tooltip>
                      )}
                      {segment.isPublic && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Eye className="h-3 w-3 shrink-0 text-neutral-400 dark:text-neutral-500" />
                          </TooltipTrigger>
                          <TooltipContent>{t("Shown on the public dashboard")}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {summarize(segment)}
                    </div>
                  </div>
                  <Check className={cn("h-4 w-4 mt-0.5 shrink-0", !isActive && "invisible")} />
                  {segment.canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t("Segment actions")}
                          onClick={event => event.stopPropagation()}
                          className="-mr-1 mt-0.5 rounded p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(segment)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("Edit segment")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setPendingDelete(segment)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
      {footer}
      <AlertDialog open={pendingDelete !== null} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete segment?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "“{name}” will be removed for everyone who uses it. Links that already expanded its filters keep working.",
                { name: pendingDelete?.name ?? "" }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
