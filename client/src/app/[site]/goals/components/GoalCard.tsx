"use client";

import { Copy, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteGoal } from "../../../../api/analytics/goals/useDeleteGoal";
import { Goal } from "../../../../api/analytics/goals/useGetGoals";
import { EventIcon, PageviewIcon } from "../../../../components/EventIcons";
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
import GoalFormModal from "./GoalFormModal";

interface GoalCardProps {
  goal: Goal;
  siteId: number;
}

export default function GoalCard({ goal, siteId }: GoalCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteGoalMutation = useDeleteGoal();

  const handleDelete = async () => {
    try {
      await deleteGoalMutation.mutateAsync(goal.goalId);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  return (
    <>
      <div className="rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden relative">
        <div className="px-4 py-3 flex items-center mb-1">
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
              <span className="text-xs text-neutral-400 mr-2">Pattern:</span>
              <code className="text-xs bg-neutral-800 px-1 py-0.5 rounded">
                {goal.goalType === "path" ? goal.config.pathPattern : goal.config.eventName}
              </code>

              {goal.goalType === "event" && goal.config.eventPropertyKey && (
                <div className="mt-1 text-xs text-neutral-400">
                  Property:{" "}
                  <code className="text-xs bg-neutral-800 px-1 py-0.5 rounded text-neutral-100">
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
                <div className="text-xs text-neutral-400">Conversions</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-base">{(goal.conversion_rate * 100).toFixed(2)}%</div>
                <div className="text-xs text-neutral-400">Conversion Rate</div>
              </div>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex flex-shrink-0 gap-1 pl-4">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setIsDeleteDialogOpen(true)} variant="ghost" size="smIcon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Goal</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="bg-neutral-700 h-1.5 w-full absolute bottom-0 left-0"></div>
        <div
          style={{
            width: goal.conversion_rate * 100 + "%",
          }}
          className="bg-accent-400/75 h-1.5 absolute bottom-0 left-0"
        ></div>
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
