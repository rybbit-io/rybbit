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
  // Document tabs (open many, close any), so not a fixed tab primitive, but in
  // ui/tabs' palette: neutral track, flat active tab, no resting shadow.
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const tabIsBusy = runningTabIds.has(tab.id) || generatingTabIds.has(tab.id);

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              "group flex h-8 min-w-[120px] items-center justify-between gap-2 rounded-md px-2 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300",
              isActive
                ? "bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
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
                className="rounded p-0.5 text-neutral-400 opacity-70 hover:bg-neutral-200 hover:text-neutral-700 group-hover:opacity-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                aria-label="Close query tab"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
      <Button
        type="button"
        size="smIcon"
        variant="ghost"
        onClick={onAddTab}
        // ghost's hover fill is the track's own tone; lift it one step.
        className="shrink-0 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        aria-label="New query"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
