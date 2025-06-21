"use client";

import { Card, CardContent } from "@/components/ui/card";
import { truncateString } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ErrorDetails } from "./ErrorDetails";

// Maximum length for error names
const MAX_ERROR_NAME_LENGTH = 80;

type ErrorListItemProps = {
  errorData: {
    value: string; // Error name
    count: number; // Total occurrences
    session_count: number; // Unique sessions affected
    percentage: number;
  };
  isLoading?: boolean;
};

export function ErrorListItem({
  errorData,
  isLoading = false,
}: ErrorListItemProps) {
  const [expanded, setExpanded] = useState(false);

  const handleCardClick = () => {
    setExpanded(!expanded);
  };

  return (
    <div className="mb-3 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden">
      <div className="p-3 cursor-pointer" onClick={handleCardClick}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
          {/* Left side: Error name with icon */}
          <div className="flex gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-md bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium truncate">
                  {truncateString(errorData.value, MAX_ERROR_NAME_LENGTH)}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">JavaScript Error</p>
            </div>
          </div>

          {/* Right side: Error statistics and expand icon */}
          <div className="flex items-center gap-6 w-full md:w-auto">
            {/* Occurrences */}
            <div className="text-center min-w-[100px]">
              <div>
                <span className="text-base font-semibold">
                  {errorData.count.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-foreground/70">occurrences</span>
              </div>
            </div>

            {/* Sessions affected */}
            <div className="text-center min-w-[100px]">
              <div>
                <span className="text-base font-semibold">
                  {errorData.session_count.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-foreground/70">sessions</span>
              </div>
            </div>

            {/* Percentage */}
            <div className="text-right min-w-[80px]">
              <div>
                <span className="text-base font-semibold">
                  {errorData.percentage.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-xs text-foreground/70">of sessions</span>
              </div>
            </div>

            {/* Expand/Collapse icon */}
            <div className="ml-2 flex-shrink-0 flex">
              {expanded ? (
                <ChevronDown
                  className="w-4 h-4 text-gray-400"
                  strokeWidth={3}
                />
              ) : (
                <ChevronRight
                  className="w-4 h-4 text-gray-400"
                  strokeWidth={3}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded content using ErrorDetails component */}
      {expanded && <ErrorDetails errorName={errorData.value} />}
    </div>
  );
}
