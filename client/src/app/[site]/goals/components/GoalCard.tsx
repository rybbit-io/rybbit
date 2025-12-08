"use client";

import { ChevronDown, ChevronUp, Copy, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteGoal } from "../../../../api/analytics/hooks/goals/useDeleteGoal";
import { Goal } from "../../../../api/analytics/endpoints";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { useStore } from "../../../../lib/store";
import GoalFormModal from "./GoalFormModal";

interface GoalCardProps {
  goal: Goal;
  siteId: number;
}

const LIMIT = 25;

export default function GoalCard({ goal, siteId }: GoalCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
          className="px-4 py-3 flex items-center mb-1 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          onClick={toggleExpansion}
        >
          {/* Left section - Title and type */}
          <div className="flex-1 pr-4">
            <h3 className="font-medium text-base flex items-center gap-2">
              {goal.goalType === "path" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PageviewIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Page Goal</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <EventIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Event Goal</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {goal.name || `Goal #${goal.goalId}`}
            </h3>

            <div className="mt-1">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 mr-2">Pattern:</span>
              <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                {goal.goalType === "path" ? goal.config.pathPattern : goal.config.eventName}
              </code>

              {goal.goalType === "event" && goal.config.eventPropertyKey && (
                <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Property:{" "}
                  <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-900 dark:text-neutral-100">
                    {goal.config.eventPropertyKey}: {String(goal.config.eventPropertyValue)}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Center section - Stats */}
          <div className="flex-1 flex justify-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="font-bold text-base">{goal.total_conversions.toLocaleString()}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Conversions</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-base">{(goal.conversion_rate * 100).toFixed(2)}%</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Conversion Rate</div>
              </div>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex shrink-0 gap-1 pl-4">
            <div onClick={e => e.stopPropagation()}>
              <GoalFormModal
                siteId={siteId}
                goal={goal}
                trigger={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="smIcon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit Goal</TooltipContent>
                  </Tooltip>
                }
              />
            </div>
            <div onClick={e => e.stopPropagation()}>
              <GoalFormModal
                siteId={siteId}
                goal={goal}
                isCloneMode={true}
                trigger={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="smIcon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clone Goal</TooltipContent>
                  </Tooltip>
                }
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={e => {
                    e.stopPropagation(); // Prevent expanding when clicking delete
                    setIsDeleteDialogOpen(true);
                  }}
                  variant="ghost"
                  size="smIcon"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Goal</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="smIcon">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? "Collapse" : "Expand to view conversions"}</TooltipContent>
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
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-3">Converted Sessions</h4>
            <SessionsList
              sessions={sessions}
              isLoading={isLoadingSessions}
              page={page}
              onPageChange={setPage}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              emptyMessage="No sessions converted to this goal in the selected time period."
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the goal and remove it from all reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              {deleteGoalMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
