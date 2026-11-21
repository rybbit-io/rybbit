"use client";

import { AlertCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import type { CustomQueryRow } from "../../../../api/analytics/endpoints";
import type { QueryTab, SortState } from "../types";
import { QueryResultsExportMenu } from "./QueryResultsExportMenu";
import { ResultsTable } from "./ResultsTable";

type ResultsPanelProps = {
  activeTab?: QueryTab;
  columns: string[];
  rows: CustomQueryRow[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
};

export function ResultsPanel({ activeTab, columns, rows, sort, onSortChange }: ResultsPanelProps) {
  const t = useExtracted();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-150 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <div className="flex h-10 items-center justify-between border-b border-neutral-100 px-3 dark:border-neutral-850">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t("Results")}</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {activeTab?.resultError ? (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {t("Error")}
              </span>
            ) : activeTab?.hasRun ? (
              t("{count} rows", { count: activeTab.rows.length.toLocaleString() })
            ) : (
              t("Not run")
            )}
          </div>
          {activeTab?.hasRun && !activeTab.resultError && rows.length > 0 && (
            <QueryResultsExportMenu rows={rows} columns={columns} filenameBase={activeTab.name || "query-results"} />
          )}
        </div>
      </div>

      {activeTab?.resultError ? (
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
          <div className="w-full rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4" />
              {t("Error")}
            </div>
            <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded border border-red-200 bg-white/70 p-3 font-mono text-xs leading-5 text-red-800 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-100">
              {activeTab.resultError}
            </pre>
          </div>
        </div>
      ) : columns.length > 0 ? (
        <ResultsTable columns={columns} rows={rows} sort={sort} onSortChange={onSortChange} />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
          {activeTab?.hasRun ? t("No rows returned") : t("Run a query")}
        </div>
      )}
    </div>
  );
}
