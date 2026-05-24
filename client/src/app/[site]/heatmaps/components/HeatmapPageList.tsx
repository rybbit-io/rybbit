"use client";

import { FileText, Loader2 } from "lucide-react";
import { HeatmapPage } from "../../../../api/analytics/endpoints/heatmap";
import { cn } from "../../../../lib/utils";

interface HeatmapPageListProps {
  pages: HeatmapPage[];
  selectedPathname: string | null;
  onSelectPage: (pathname: string) => void;
  isLoading: boolean;
}

export function HeatmapPageList({ pages, selectedPathname, onSelectPage, isLoading }: HeatmapPageListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <FileText className="w-8 h-8 text-neutral-400 mb-2" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No pages with click data found</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          Click data will appear once session replay captures user interactions
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto h-full">
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-2 py-1 uppercase tracking-wide">
        Pages ({pages.length})
      </div>
      {pages.map((page) => (
        <button
          key={page.pathname}
          onClick={() => onSelectPage(page.pathname)}
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800",
            selectedPathname === page.pathname && "bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-700"
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{page.pathname}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {page.sessionCount.toLocaleString()} sessions
            </div>
          </div>
          <div className="ml-2 px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {page.clickCount.toLocaleString()}
          </div>
        </button>
      ))}
    </div>
  );
}
