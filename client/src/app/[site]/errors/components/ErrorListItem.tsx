"use client";

import { truncateString } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ErrorDetails } from "./ErrorDetails";
import { ErrorSparklineChart } from "./ErrorSparklineChart";
import { useGetErrorBucketed } from "@/api/analytics/hooks/errors/useGetErrorBucketed";
import { ErrorNameItem } from "../../../../api/analytics/endpoints";

// Maximum length for error messages
const MAX_ERROR_MESSAGE_LENGTH = 150;

type ErrorListItemProps = {
  errorData: ErrorNameItem;
};

export function ErrorListItem({ errorData }: ErrorListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleCardClick = () => {
    setExpanded(!expanded);
  };

  // Get error bucketed data for sparkline
  const { data: errorBucketedData, isLoading: isLoadingBucketed } = useGetErrorBucketed({
    errorMessage: errorData.value,
  });

  return (
    <div
      className="mb-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="p-3 cursor-pointer" onClick={handleCardClick}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
          {/* Left side: Error message with icon */}
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-sm font-medium truncate">{errorData.errorName || "JavaScript Error"}</h3>
            <p className="text-xs text-muted-foreground">{truncateString(errorData.value, MAX_ERROR_MESSAGE_LENGTH)}</p>
          </div>

          {/* Right side: Sparkline chart and error statistics */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Sparkline chart */}
            <div className="h-12 w-56 relative overflow-visible">
              <ErrorSparklineChart
                data={errorBucketedData}
                isHovering={isHovering}
                errorMessage={errorData.value}
                isLoading={isLoadingBucketed}
              />
            </div>

            {/* Error statistics */}
            <div className="flex items-center ">
              {/* Occurrences */}
              <div className="text-center min-w-[80px]">
                <div>
                  <span className="text-base font-semibold">{errorData.count.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-foreground/70">occurrences</span>
                </div>
              </div>

              {/* Sessions affected */}
              <div className="text-center min-w-[80px]">
                <div>
                  <span className="text-base font-semibold">{errorData.sessionCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-foreground/70">sessions</span>
                </div>
              </div>

              {/* Expand/Collapse icon */}
              <div className="ml-2 shrink-0 flex">
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={3} />
                ) : (
                  <ChevronRight className="w-4 h-4 text-neutral-500 dark:text-neutral-400" strokeWidth={3} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded content using ErrorDetails component */}
      {expanded && <ErrorDetails errorMessage={errorData.value} />}
    </div>
  );
}
