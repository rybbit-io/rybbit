"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, ChevronDown, ChevronUp, Copy, Edit, Eye, MousePointerClick, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteFunnel } from "../../../../api/analytics/hooks/funnels/useDeleteFunnel";
import { useGetFunnel } from "../../../../api/analytics/hooks/funnels/useGetFunnel";
import { SavedFunnel } from "../../../../api/analytics/endpoints";
import { ThreeDotLoader } from "../../../../components/Loaders";
import { EditFunnelDialog } from "./EditFunnel";
import { Funnel } from "./Funnel";
import { EventIcon, PageviewIcon } from "../../../../components/EventIcons";

interface FunnelRowProps {
  funnel: SavedFunnel;
  index: number;
}

export function FunnelRow({ funnel, index }: FunnelRowProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  // Funnel data fetching
  const {
    data,
    isError,
    error,
    isLoading: isPending,
    isSuccess,
  } = useGetFunnel(
    expanded
      ? {
          steps: funnel.steps,
        }
      : undefined
  );

  // Delete funnel mutation
  const { mutate: deleteFunnel, isPending: isDeleting } = useDeleteFunnel();

  // Handle expansion
  const handleExpand = () => {
    setExpanded(!expanded);
  };

  // Handle funnel deletion
  const handleDeleteFunnel = async () => {
    try {
      await deleteFunnel(funnel.id);
      toast.success("Funnel deleted successfully");
    } catch (error) {
      console.error("Error deleting funnel:", error);
      throw error; // Let the ConfirmationModal handle the error display
    }
  };

  return (
    <Card className="mb-4 overflow-hidden">
      {/* Header row (always visible) */}
      <div className="flex items-center justify-between py-2 px-5">
        <div className="flex items-center grow cursor-pointer transition-colors" onClick={handleExpand}>
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex flex-col gap-3">
            {/* Steps visualization */}
            <div className="flex flex-wrap gap-1">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-base mr-2">{funnel.name}</h3>
              {funnel.steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <ArrowRight className="h-3 w-3 mx-1 text-neutral-400" />}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis flex items-center cursor-default">
                        {step.type === "page" ? (
                          <PageviewIcon className="h-3 w-3 mr-1" />
                        ) : (
                          <EventIcon className="h-3 w-3 mr-1" />
                        )}
                        <span className="max-w-[120px] overflow-hidden text-ellipsis inline-block">
                          {step.name || step.value}
                          {step.type === "event" && step.eventPropertyKey && (
                            <span className="text-xs text-yellow-400 ml-1">*</span>
                          )}
                        </span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div>
                        <span className="font-semibold">{step.type === "page" ? "Page" : "Event"}:</span> {step.value}
                      </div>
                      {step.name && (
                        <div>
                          <span className="font-semibold">Label:</span> {step.name}
                        </div>
                      )}
                      {step.type === "event" && step.eventPropertyKey && step.eventPropertyValue !== undefined && (
                        <div>
                          <span className="font-semibold">Property:</span> {step.eventPropertyKey} ={" "}
                          {String(step.eventPropertyValue)}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex">
            {/* Edit button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={e => {
                    e.stopPropagation();
                    setIsEditModalOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Funnel</TooltipContent>
            </Tooltip>

            {/* Clone button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={e => {
                    e.stopPropagation();
                    setIsCloneModalOpen(true);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clone Funnel</TooltipContent>
            </Tooltip>

            {/* Delete button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={e => {
                    e.stopPropagation();
                    setIsDeleteModalOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Funnel</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="icon" onClick={handleExpand}>
              {expanded ? <ChevronUp strokeWidth={3} /> : <ChevronDown strokeWidth={3} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-4">
            {isPending ? (
              <ThreeDotLoader className="h-[400px]" />
            ) : isError ? (
              <div className="text-red-500 p-4 text-center">
                Error loading funnel: {error instanceof Error ? error.message : "Unknown error"}
              </div>
            ) : data && data.length > 0 ? (
              <Funnel data={data} steps={funnel.steps} isError={isError} error={error} isPending={isPending} />
            ) : (
              <div className="text-center p-6 text-neutral-500">No funnel data available</div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        title="Delete Funnel"
        description={`Are you sure you want to delete "${funnel.name}"? This action cannot be undone.`}
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        onConfirm={handleDeleteFunnel}
        primaryAction={{
          children: isDeleting ? "Deleting..." : "Delete",
          variant: "destructive",
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
