"use client";

import { AlertCircle, X } from "lucide-react";
import { useExtracted, useLocale } from "next-intl";
import type { CustomQueryRow } from "../../../../api/analytics/endpoints";
import { PixelLoader } from "../../../../components/interior/pixel-loader";
import { formatElapsed } from "../../../../components/interior/use-elapsed-time";
import { Button } from "../../../../components/ui/button";
import type { QueryTab, SortState } from "../types";
import type { TrackedRun } from "../useRunTracker";
import { QueryResultsExportMenu } from "./QueryResultsExportMenu";
import { ResultsTable } from "./ResultsTable";

type ResultsPanelProps = {
  activeTab?: QueryTab;
  /** The active tab's latest run, if it has one. */
  run?: TrackedRun;
  columns: string[];
  rows: CustomQueryRow[];
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  onCancelRun: () => void;
};

export function ResultsPanel({ activeTab, run, columns, rows, sort, onSortChange, onCancelRun }: ResultsPanelProps) {
  const t = useExtracted();
  const locale = useLocale();
  const isRunning = run?.status === "running";
  const isCancelled = run?.status === "cancelled";
  const rowCount = (activeTab?.rows.length ?? 0).toLocaleString(locale);

  // Announced once per state change. The ticking timer stays out of the live region.
  const announcement =
    run?.status === "running"
      ? t("Running query")
      : run?.status === "done"
        ? t("Query finished: {count} rows", { count: rowCount })
        : run?.status === "failed"
          ? t("Query failed")
          : run?.status === "cancelled"
            ? t("Query cancelled")
            : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-neutral-150 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <div role="status" className="sr-only">
        {announcement}
      </div>
      <div className="flex h-10 items-center justify-between border-b border-neutral-100 px-3 dark:border-neutral-850">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t("Results")}</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {isRunning ? null : isCancelled ? (
              t("Query cancelled")
            ) : activeTab?.resultError ? (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {t("Error")}
              </span>
            ) : activeTab?.hasRun ? (
              <span className="tabular-nums">
                {t("{count} rows", { count: rowCount })}
                {run?.status === "done" && (
                  <>
                    <span aria-hidden> · </span>
                    {formatElapsed(run.durationMs, locale)}
                  </>
                )}
              </span>
            ) : (
              t("Not run")
            )}
          </div>
          {!isRunning && activeTab?.hasRun && !activeTab.resultError && rows.length > 0 && (
            <QueryResultsExportMenu rows={rows} columns={columns} filenameBase={activeTab.name || "query-results"} />
          )}
        </div>
      </div>

      {isRunning ? (
        <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-3 p-4">
          <PixelLoader label={t("Running query")} startedAt={run.startedAt} />
          <Button type="button" variant="outline" size="sm" onClick={onCancelRun}>
            <X className="h-4 w-4" />
            {t("Cancel")}
          </Button>
        </div>
      ) : activeTab?.resultError ? (
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
