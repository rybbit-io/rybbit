"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { DateTime } from "luxon";

interface RefreshControlsProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefetching: boolean;
}

export function RefreshControls({ lastUpdated, onRefresh, isRefetching }: RefreshControlsProps) {
  const formattedTime = lastUpdated
    ? DateTime.fromJSDate(lastUpdated).toLocaleString(DateTime.TIME_WITH_SECONDS)
    : "Never";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">Last updated: {formattedTime}</span>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefetching}>
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}
