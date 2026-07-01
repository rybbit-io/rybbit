"use client";

import { useExtracted } from "next-intl";
import { ChevronDown, ChevronUp, Copy, Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { useDeleteGoal } from "../../../../api/analytics/hooks/goals/useDeleteGoal";
import { Goal, GoalTimeSeriesPoint } from "../../../../api/analytics/endpoints";
import { useGetGoalSessions } from "../../../../api/analytics/hooks/goals/useGetGoalSessions";
import { EventIcon, PageviewIcon } from "../../../../components/EventIcons";
import { SessionsList } from "../../../../components/Sessions/SessionsList";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../../components/ui/alert-dialog";
import { Button } from "../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { formatChartDateTime } from "../../../../lib/dateTimeUtils";
import { getTimezone, useStore } from "../../../../lib/store";
import GoalFormModal from "./GoalFormModal";
import { GoalBarChartSkeleton } from "./skeleton";

interface GoalCardProps {
  goal: Goal;
  siteId: number;
  timeSeries?: GoalTimeSeriesPoint[];
  isLoadingTimeSeries: boolean;
}

const LIMIT = 25;
const MAX_BARS = 44;

type ChartMetric = "conversions" | "conversion_rate";
type GoalMetricBar = {
  value: number;
  conversions: number;
  sessions: number;
  startTime: string;
  endTime: string;
};

const formatMetricValue = (metric: ChartMetric, value: number) => {
  if (metric === "conversion_rate") {
    return `${(value * 100).toFixed(2)}%`;
  }

  return value.toLocaleString();
};

const formatBarTime = (bar: GoalMetricBar, bucket: ReturnType<typeof useStore.getState>["bucket"]) => {
  const timezone = getTimezone();
  const start = DateTime.fromSQL(bar.startTime, { zone: timezone });
  const end = DateTime.fromSQL(bar.endTime, { zone: timezone });
  const startLabel = formatChartDateTime(start, bucket);
  const endLabel = formatChartDateTime(end, bucket);

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

function GoalMetricBarChart({
  data,
  metric,
  isLoading,
}: {
  data?: GoalTimeSeriesPoint[];
  metric: ChartMetric;
  isLoading: boolean;
}) {
  const t = useExtracted();
  const { bucket } = useStore();

  const bars = useMemo(() => {
    if (!data?.length) return [];

    const groupSize = Math.ceil(data.length / MAX_BARS);
    const grouped: GoalMetricBar[] = [];

    for (let i = 0; i < data.length; i += groupSize) {
      const group = data.slice(i, i + groupSize);
      const conversions = group.reduce((sum, point) => sum + point.conversions, 0);
      const sessions = group.reduce((sum, point) => sum + point.total_sessions, 0);

      grouped.push({
        value: metric === "conversions" ? conversions : sessions > 0 ? conversions / sessions : 0,
        conversions,
        sessions,
        startTime: group[0].time,
        endTime: group[group.length - 1].time,
      });
    }

    return grouped;
  }, [data, metric]);

  if (isLoading) {
    return <GoalBarChartSkeleton />;
  }

  if (bars.length === 0) {
    return <GoalBarChartSkeleton />;
  }

  const max = Math.max(...bars.map(bar => bar.value));
  const metricLabel = metric === "conversions" ? t("Conversions") : t("Conversion Rate");

  return (
    <div className="hidden lg:flex h-8 w-32 xl:w-44 shrink-0 items-end gap-px">
      {bars.map((bar, index) => {
        const height = max > 0 ? Math.max(10, (bar.value / max) * 100) : 10;

        return (
          <Tooltip key={`${metric}-${index}`} delayDuration={100}>
            <TooltipTrigger asChild>
              <div
                className={
                  metric === "conversions"
                    ? "flex-1 min-w-px rounded-t-sm bg-dataviz/70 dark:bg-dataviz/70"
                    : "flex-1 min-w-px rounded-t-sm bg-dataviz/70 dark:bg-dataviz/70"
                }
                style={{
                  height: `${height}%`,
                  opacity: max > 0 ? 1 : 0.35,
                }}
                onClick={event => event.stopPropagation()}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="w-44">
              <div className="space-y-1">
                <div className="font-medium text-neutral-700 dark:text-neutral-200">{formatBarTime(bar, bucket)}</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500 dark:text-neutral-400">{metricLabel}</span>
                  <span className="font-semibold">{formatMetricValue(metric, bar.value)}</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default function GoalCard({ goal, siteId, timeSeries, isLoadingTimeSeries }: GoalCardProps) {
  const t = useExtracted();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const deleteGoalMutation = useDeleteGoal();
  const { time } = useStore();

  // Fetch sessions when expanded
  const { data: sessionsData, isLoading: isLoadingSessions } = useGetGoalSessions({
    goalId: goal.goalId,
    siteId,
    time,
    page,
    limit: LIMIT + 1,
    enabled: isExpanded,
  });

  const handleDelete = async () => {
    try {
      await deleteGoalMutation.mutateAsync(goal.goalId);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const allSessions = sessionsData?.data || [];
  const hasNextPage = allSessions.length > LIMIT;
  const sessions = allSessions.slice(0, LIMIT);
  const hasPrevPage = page > 1;

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setPage(1); // Reset to first page when expanding
    }
  };

  return (
    <>
      <div className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden relative">
        <div
          className="px-4 py-3 flex gap-3 flex-row items-center mb-1 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          onClick={toggleExpansion}
        >
          {/* Left section - Title and type */}
          <div className=" min-w-0 md:flex-1 md:pr-4">
            <h3 className="font-medium text-base flex items-center gap-2 min-w-0">
              {goal.goalType === "path" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PageviewIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Page Goal")}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <EventIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Event Goal")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <span className="truncate">{goal.name || t("Goal #{goalId}", { goalId: String(goal.goalId) })}</span>
            </h3>

            <div className="mt-1 min-w-0">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 mr-2">{t("Pattern")}:</span>
              <code className="inline-block max-w-full truncate align-bottom text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                {goal.goalType === "path" ? goal.config.pathPattern : goal.config.eventName}
              </code>

              {goal.goalType === "event" && goal.config.eventPropertyKey && (
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {t("Property")}:{" "}
                  <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-900 dark:text-neutral-100">
                    {goal.config.eventPropertyKey}: {String(goal.config.eventPropertyValue)}
                  </code>
                </div>
              )}
            </div>
          </div>
          {/* Center section - Stats */}
          <div className="w-full min-w-0 md:flex-1 flex justify-start md:justify-center">
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4 md:gap-6">
              <div className="flex items-center gap-3">
                <GoalMetricBarChart data={timeSeries} metric="conversions" isLoading={isLoadingTimeSeries} />
                <div className="min-w-[86px] text-left">
                  <div className="font-bold text-base">{goal.total_conversions.toLocaleString()}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("Conversions")}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <GoalMetricBarChart data={timeSeries} metric="conversion_rate" isLoading={isLoadingTimeSeries} />
                <div className="min-w-[104px] text-left">
                  <div className="font-bold text-base">{(goal.conversion_rate * 100).toFixed(2)}%</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("Conversion Rate")}</div>
                </div>
              </div>
            </div>
          </div>
          {/* Right section - Actions */}
          <div className="flex shrink-0 justify-end gap-1 md:pl-4">
            <div onClick={e => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild variant="ghost" size="smIcon" aria-label={t("Goal actions")}>
                  <Button variant="ghost" size="smIcon" aria-label={t("Goal actions")}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                    <Edit className="h-4 w-4" />
                    {t("Edit Goal")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCloneModalOpen(true)}>
                    <Copy className="h-4 w-4" />
                    {t("Clone Goal")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("Delete Goal")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="smIcon">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? t("Collapse") : t("Expand to view conversions")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="relative">
          <div className="bg-neutral-100 dark:bg-neutral-700 h-1.5 w-full absolute bottom-0 left-0"></div>
          <div
            style={{
              width: goal.conversion_rate * 100 + "%",
            }}
            className="bg-accent-400/75 h-1.5 absolute bottom-0 left-0"
          ></div>
        </div>

        {/* Expanded Sessions Section */}
        {isExpanded && (
          <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-4">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-3">
              {t("Converted Sessions")}
            </h4>
            <SessionsList
              sessions={sessions}
              isLoading={isLoadingSessions}
              page={page}
              onPageChange={setPage}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              emptyMessage={t("No sessions converted to this goal in the selected time period.")}
            />
          </div>
        )}
      </div>
      <GoalFormModal siteId={siteId} goal={goal} open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
      <GoalFormModal
        siteId={siteId}
        goal={goal}
        isCloneMode={true}
        open={isCloneModalOpen}
        onOpenChange={setIsCloneModalOpen}
      />
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure you want to delete this goal?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This action cannot be undone. This will permanently delete the goal and remove it from all reports.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              {deleteGoalMutation.isPending ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
