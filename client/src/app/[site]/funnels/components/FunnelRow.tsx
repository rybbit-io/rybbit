"use client";

import { ArrowRight, ChevronDown, ChevronRight, Copy, Ellipsis, Split, SquarePen, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Goal } from "@/api/analytics/endpoints";
import { useDeleteFunnel } from "@/api/analytics/hooks/funnels/useDeleteFunnel";
import { useGetFunnel } from "@/api/analytics/hooks/funnels/useGetFunnel";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { EventTypeIcon } from "@/components/EventIcons";
import { Delta } from "@/components/site/Delta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { resolvePropertyFilters, targetTypeToEventType } from "@/lib/events";
import { cn } from "@/lib/utils";
import { EditFunnelDialog } from "./EditFunnel";
import { Funnel } from "./Funnel";
import {
  conversionDelta,
  findMatchingGoal,
  formatRate,
  FunnelMetrics,
  FunnelRowData,
  metricsFromAnalysis,
  stepLabel,
} from "./funnelMetrics";
import { useStepTypeLabels } from "./useStepTypeLabels";

/**
 * Chevron, funnel, step strip, entered, converted, conversion, change, actions.
 * The figure columns appear when the list itself is wide enough (a container
 * query: the sidebar takes a share of the window); otherwise the row keeps the
 * first two and the last, and states its figures on one line.
 */
export const FUNNEL_ROW_GRID =
  "grid grid-cols-[16px_minmax(0,1fr)_28px] items-center gap-x-3 @3xl:grid-cols-[16px_minmax(0,1fr)_84px_72px_72px_64px_92px_28px]";

const MUTED = "text-neutral-500 dark:text-neutral-400";

/** One bar per step: the share of entering sessions still in the funnel at that step. */
function StepStrip({ metrics }: { metrics: FunnelMetrics }) {
  const t = useExtracted();
  return (
    <div
      className="flex h-6 items-end gap-[3px]"
      role="img"
      aria-label={t("Sessions remaining at each of {count} steps", { count: String(metrics.steps.length) })}
    >
      {metrics.steps.map((step, index) => (
        <div
          key={index}
          className="relative h-full min-w-[2px] max-w-2 flex-1 overflow-hidden rounded-[2px] bg-neutral-100 dark:bg-neutral-800"
        >
          {step.sessions > 0 && (
            <div
              className="absolute inset-x-0 bottom-0 rounded-[2px] bg-dataviz"
              style={{ height: `${Math.max(6, step.ofStart * 100).toFixed(1)}%` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedSkeleton({ steps }: { steps: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: Math.min(steps, 6) }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="hidden h-4 w-40 rounded @2xl:block" />
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}

export interface FunnelRowProps {
  row: FunnelRowData;
  expanded: boolean;
  onToggle: () => void;
  /** funnels:write: edit, clone and delete. */
  canWrite: boolean;
  /** The selected period's numbers are on their way. */
  isLoading: boolean;
  /** The comparison period's numbers are on their way. */
  isLoadingComparison?: boolean;
  /** The comparison window in words, for the legend. */
  comparisonLabel?: string | null;
  /** The site's goals, to link the last step to the one that matches it. */
  goals?: Goal[];
  /** The Goals and Journeys pages of this site, carrying the current period and filters. */
  links: { goals: string; journeys: string };
}

export function FunnelRow({
  row,
  expanded,
  onToggle,
  canWrite,
  isLoading,
  isLoadingComparison = false,
  comparisonLabel,
  goals,
  links,
}: FunnelRowProps) {
  const t = useExtracted();
  const typeLabels = useStepTypeLabels();
  const { funnel, current, previous } = row;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  // The summary covers a capped number of funnels. One it leaves out (or every
  // one, if the summary failed) is analyzed on its own when opened: the same
  // step counts, without step times or a comparison. The row then shows those
  // figures too.
  const needsAnalysis = expanded && !current && !isLoading;
  const analysis = useGetFunnel(needsAnalysis ? { steps: funnel.steps } : undefined);
  const metrics = current ?? (needsAnalysis && analysis.data?.length ? metricsFromAnalysis(analysis.data) : null);

  // Delete funnel mutation. mutateAsync so the modal waits for the server and shows its errors.
  const { mutateAsync: deleteFunnel, isPending: isDeleting } = useDeleteFunnel();

  const handleDeleteFunnel = async () => {
    try {
      await deleteFunnel(funnel.id);
      toast.success(t("Funnel deleted successfully"));
    } catch (error) {
      console.error("Error deleting funnel:", error);
      throw error; // Let the ConfirmationModal handle the error display
    }
  };

  const nameOf = (index: number) => {
    const step = funnel.steps[index];
    return stepLabel(step, typeLabels[step.type] ?? typeLabels.event);
  };

  const delta = conversionDelta(row);
  const worst = metrics?.worstStep ?? null;
  const lastStep = funnel.steps[funnel.steps.length - 1];
  const goal = expanded && goals && lastStep ? findMatchingGoal(lastStep, goals) : undefined;

  // A figure cell: the number, a skeleton while it loads, a dash when there is none.
  const figure = (value: string | null | undefined, className?: string) =>
    isLoading ? (
      <Skeleton className="ml-auto h-4 w-10 rounded" />
    ) : (
      <span className={cn("tabular-nums", className)}>{value ?? "—"}</span>
    );

  return (
    <Card id={`funnel-${funnel.id}`} className="@container">
      {/* Header row (always visible) */}
      <div
        className={cn(FUNNEL_ROW_GRID, "cursor-pointer px-4", expanded ? "py-3" : "py-2.5")}
        onClick={onToggle}
        data-testid="funnel-row-header"
      >
        {expanded ? (
          <ChevronDown className={cn("h-4 w-4", MUTED)} aria-hidden="true" />
        ) : (
          <ChevronRight className={cn("h-4 w-4", MUTED)} aria-hidden="true" />
        )}

        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <button
              type="button"
              className="min-w-0 cursor-pointer truncate rounded-sm text-left text-sm font-medium text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:text-neutral-100 dark:focus-visible:ring-neutral-300"
              aria-expanded={expanded}
              onClick={event => {
                event.stopPropagation();
                onToggle();
              }}
            >
              {funnel.name}
            </button>
            <span className={cn("shrink-0 text-xs", MUTED)}>
              {t("{count} steps", { count: String(funnel.steps.length) })}
            </span>
          </div>

          {expanded ? (
            <div className={cn("mt-1 text-xs", MUTED)}>
              {t("Steps in order within one session")}
              {metrics && worst !== null && (
                <>
                  {" · "}
                  {t("biggest drop-off {from} to {to} ({rate})", {
                    from: nameOf(worst),
                    to: nameOf(worst + 1),
                    rate: formatRate(1 - metrics.steps[worst].continueRate!),
                  })}
                </>
              )}
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-y-1 text-xs">
              {funnel.steps.map((step, index) => {
                const propertyFilters = resolvePropertyFilters(step);
                const typeLabel = typeLabels[step.type] ?? typeLabels.event;
                return (
                  <div key={index} className="flex min-w-0 items-center">
                    {index > 0 && (
                      <ArrowRight
                        className="mx-1 h-3 w-3 shrink-0 text-neutral-400 dark:text-neutral-500"
                        aria-hidden="true"
                      />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex min-w-0 cursor-default items-center gap-1 whitespace-nowrap rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          <EventTypeIcon
                            type={targetTypeToEventType(step.type)}
                            className="h-3 w-3 shrink-0"
                            tooltip={false}
                          />
                          <span className="max-w-[160px] truncate">{stepLabel(step, typeLabel)}</span>
                          {propertyFilters.length > 0 && (
                            <span className={cn("max-w-[120px] truncate", MUTED)}>
                              {propertyFilters.map(filter => `${filter.key} = ${filter.value}`).join(", ")}
                            </span>
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <div>
                          <span className="font-semibold">{typeLabel}:</span> {step.value || t("Any")}
                        </div>
                        {step.name && (
                          <div>
                            <span className="font-semibold">{t("Label")}:</span> {step.name}
                          </div>
                        )}
                        {step.hostname && (
                          <div>
                            <span className="font-semibold">{t("Hostname")}:</span> {step.hostname}
                          </div>
                        )}
                        {propertyFilters.length > 0 && (
                          <div>
                            <span className="font-semibold">{t("Property")}:</span>{" "}
                            {propertyFilters.map(filter => `${filter.key} = ${filter.value}`).join(", ")}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          )}

          {/* The figure columns, as one line, where there is no room for columns. */}
          <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs @3xl:hidden", MUTED)}>
            {isLoading ? (
              <Skeleton className="h-4 w-40 rounded" />
            ) : metrics ? (
              <>
                <span>{t("{count} entered", { count: metrics.entered.toLocaleString() })}</span>
                <span>{t("{count} converted", { count: metrics.converted.toLocaleString() })}</span>
                {metrics.conversion !== null && (
                  <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {formatRate(metrics.conversion)}
                  </span>
                )}
                <Delta value={delta} />
              </>
            ) : null}
          </div>
        </div>

        <div className="hidden @3xl:block">
          {isLoading ? <Skeleton className="h-6 w-12 rounded" /> : metrics ? <StepStrip metrics={metrics} /> : null}
        </div>
        <div className="hidden text-right text-sm text-neutral-900 dark:text-neutral-100 @3xl:block">
          {figure(metrics?.entered.toLocaleString())}
        </div>
        <div className="hidden text-right text-sm text-neutral-900 dark:text-neutral-100 @3xl:block">
          {figure(metrics?.converted.toLocaleString())}
        </div>
        <div className="hidden text-right text-sm text-neutral-900 dark:text-neutral-50 @3xl:block">
          {figure(metrics?.conversion == null ? null : formatRate(metrics.conversion), "font-semibold")}
        </div>
        <div className="hidden justify-end @3xl:flex">
          {isLoadingComparison ? <Skeleton className="h-4 w-12 rounded" /> : <Delta value={delta} />}
        </div>

        {canWrite ? (
          // Not interactive itself: it only keeps the menu's clicks from toggling the row.
          <div onClick={event => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="smIcon"
                  aria-label={t("Edit, clone or delete {name}", { name: funnel.name })}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsEditModalOpen(true)}>
                  <SquarePen className="h-4 w-4" />
                  {t("Edit funnel")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsCloneModalOpen(true)}>
                  <Copy className="h-4 w-4" />
                  {t("Clone")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setIsDeleteModalOpen(true)}
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-neutral-100 px-4 pb-3 pt-3 dark:border-neutral-800">
          {isLoading || (needsAnalysis && analysis.isLoading) ? (
            <ExpandedSkeleton steps={funnel.steps.length} />
          ) : needsAnalysis && analysis.isError ? (
            <div className="p-4 text-center text-sm text-red-500">
              {t("Error loading funnel:")}{" "}
              {analysis.error instanceof Error ? analysis.error.message : t("Failed to analyze funnel")}
            </div>
          ) : metrics ? (
            <Funnel
              steps={funnel.steps}
              metrics={metrics}
              previous={previous}
              comparisonLabel={comparisonLabel}
              goal={goal ? { name: goal.name || nameOf(funnel.steps.length - 1), href: links.goals } : null}
              actions={
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={links.journeys} prefetch={false}>
                      <Split />
                      {t("Explore paths")}
                    </Link>
                  </Button>
                  {canWrite && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsCloneModalOpen(true)}>
                        <Copy />
                        {t("Clone")}
                      </Button>
                      <Button size="sm" onClick={() => setIsEditModalOpen(true)}>
                        <SquarePen />
                        {t("Edit funnel")}
                      </Button>
                    </>
                  )}
                </>
              }
            />
          ) : (
            <div className={cn("p-6 text-center text-sm", MUTED)}>{t("No funnel data available")}</div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        title={t("Delete Funnel")}
        description={t('Are you sure you want to delete "{name}"? This action cannot be undone.', {
          name: funnel.name,
        })}
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        onConfirm={handleDeleteFunnel}
        primaryAction={{
          children: isDeleting ? t("Deleting...") : t("Delete"),
          variant: "destructive",
          disabled: isDeleting,
        }}
      />

      {/* Edit Funnel Modal */}
      {isEditModalOpen && (
        <EditFunnelDialog funnel={funnel} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
      )}

      {/* Clone Funnel Modal */}
      {isCloneModalOpen && (
        <EditFunnelDialog
          funnel={funnel}
          isOpen={isCloneModalOpen}
          onClose={() => setIsCloneModalOpen(false)}
          isCloneMode={true}
        />
      )}
    </Card>
  );
}
