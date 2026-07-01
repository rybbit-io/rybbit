"use client";

import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";
import type { QueryTab } from "../types";

type QueryTabsProps = {
  tabs: QueryTab[];
  activeTabId?: string;
  runningTabIds: Set<string>;
  generatingTabIds: Set<string>;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onAddTab: () => void;
};

export function QueryTabs({
  tabs,
  activeTabId,
  runningTabIds,
  generatingTabIds,
  onSelectTab,
  onCloseTab,
  onAddTab,
}: QueryTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-neutral-150 bg-neutral-50 p-1 dark:border-neutral-850 dark:bg-neutral-950">
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const tabIsBusy = runningTabIds.has(tab.id) || generatingTabIds.has(tab.id);

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              "group flex h-8 min-w-[120px] items-center justify-between gap-2 rounded-md border px-2 text-left text-xs transition-colors",
              isActive
                ? "border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-750 dark:bg-neutral-900 dark:text-neutral-100"
                : "border-transparent text-neutral-600 hover:bg-white/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/70 dark:hover:text-neutral-100"
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {tabIsBusy && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-neutral-400" />}
              {tab.resultError && !tabIsBusy && <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />}
              <span className="truncate">{tab.name || `Query ${index + 1}`}</span>
            </span>
            {tabs.length > 1 && (
              <span
                role="button"
                tabIndex={-1}
                onClick={event => {
                  event.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="rounded p-0.5 text-neutral-400 opacity-70 hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                aria-label="Close query tab"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
      <Button type="button" size="smIcon" variant="ghost" onClick={onAddTab} className="shrink-0" aria-label="New query">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
