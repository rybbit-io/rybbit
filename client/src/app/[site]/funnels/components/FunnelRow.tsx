"use client";

import { useDeleteFunnel } from "@/api/analytics/useDeleteFunnel";
import { useGetFunnel } from "@/api/analytics/useGetFunnel";
import { SavedFunnel } from "@/api/analytics/useGetFunnels";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DateRangeMode, Time } from "@/components/DateSelector/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Edit,
  FileText,
  FilterIcon,
  MousePointerClick,
  Trash2,
} from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { toast } from "sonner";
import { getStartAndEndDate } from "../../../../api/utils";
import { ThreeDotLoader } from "../../../../components/Loaders";
import { useGetRegionName } from "../../../../lib/geo";
import { cn } from "../../../../lib/utils";
import {
  filterTypeToLabel,
  getParameterNameLabel,
  getParameterValueLabel,
} from "../../components/shared/Filters/utils";
import { EditFunnelDialog } from "./EditFunnel";
import { Funnel } from "./Funnel";

interface FunnelRowProps {
  funnel: SavedFunnel;
}

export function FunnelRow({ funnel }: FunnelRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { getRegionName } = useGetRegionName();

  // Time state for funnel visualization - default to last 7 days
  const [time, setTime] = useState<Time>({
    mode: "range",
    startDate: DateTime.now().minus({ days: 7 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "Last 7 days",
  } as DateRangeMode);

  const { startDate, endDate } = getStartAndEndDate(time);

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
          startDate,
          endDate,
          filters: funnel.filters,
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

  // Check if funnel has filters
  const hasFilters = funnel.filters && funnel.filters.length > 0;

  return (
    <Card className="mb-4 overflow-hidden">
      {/* Header row (always visible) */}
      <div className="flex items-center justify-between py-2 px-5">
        <div
          className="flex items-center flex-grow cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          onClick={handleExpand}
        >
          <div className="mt-1 text-xs text-neutral-400 flex flex-col gap-3">
            {/* Steps visualization */}
            <div className="flex flex-wrap gap-1">
              <h3 className="font-medium text-neutral-100 text-base mr-2">
                {funnel.name}
              </h3>
              {funnel.steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && (
                    <ArrowRight className="h-3 w-3 mx-1 text-neutral-400" />
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis flex items-center cursor-default">
                          {step.type === "page" ? (
                            <FileText className="h-3 w-3 mr-1 text-blue-400" />
                          ) : (
                            <MousePointerClick className="h-3 w-3 mr-1 text-amber-400" />
                          )}
                          <span className="max-w-[120px] overflow-hidden text-ellipsis inline-block">
                            {step.name || step.value}
                            {step.type === "event" && step.eventPropertyKey && (
                              <span className="text-xs text-yellow-400 ml-1">
                                *
                              </span>
                            )}
                          </span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <div>
                          <span className="font-semibold">
                            {step.type === "page" ? "Page" : "Event"}:
                          </span>{" "}
                          {step.value}
                        </div>
                        {step.name && (
                          <div>
                            <span className="font-semibold">Label:</span>{" "}
                            {step.name}
                          </div>
                        )}
                        {step.type === "event" &&
                          step.eventPropertyKey &&
                          step.eventPropertyValue !== undefined && (
                            <div>
                              <span className="font-semibold">Property:</span>{" "}
                              {step.eventPropertyKey} ={" "}
                              {String(step.eventPropertyValue)}
                            </div>
                          )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>

            {/* Filters visualization */}
            {hasFilters && (
              <div className="flex items-center gap-1">
                <FilterIcon className="h-3 w-3 text-neutral-400" />
                <div className="flex flex-wrap gap-1">
                  {funnel.filters?.map((filter, index) => (
                    <span
                      key={index}
                      className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis flex items-center cursor-default"
                    >
                      <span className="text-neutral-300">
                        {getParameterNameLabel(filter.parameter)}
                      </span>
                      <span
                        className={cn("mx-1", filter.type === "not_equals" || filter.type === "not_contains" ? "text-red-400" : "text-emerald-400")}
                      >
                        {filterTypeToLabel(filter.type)}
                      </span>
                      <span className="text-neutral-100 max-w-[100px] overflow-hidden text-ellipsis inline-block">
                        {filter.value.length > 0
                          ? getParameterValueLabel(filter, getRegionName)
                          : "empty"}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex">
            {/* Edit button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditModalOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteModalOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleExpand}>
              {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-800">
          <div className="p-4">
            {isPending ? (
              <ThreeDotLoader className="h-[400px]" />
            ) : isError ? (
              <div className="text-red-500 p-4 text-center">
                Error loading funnel:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </div>
            ) : data && data.length > 0 ? (
              <Funnel
                data={data}
                isError={isError}
                error={error}
                isPending={isPending}
                time={time}
                setTime={setTime}
              />
            ) : (
              <div className="text-center p-6 text-neutral-500">
                No funnel data available
              </div>
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
        <EditFunnelDialog
          funnel={funnel}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </Card>
  );
}
