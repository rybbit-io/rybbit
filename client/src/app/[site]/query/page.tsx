"use client";

import { AlignLeft, Loader2, Play, Plus, Sparkles, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import { vs, vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { format as formatSql } from "sql-formatter";
import { useGetSite } from "../../../api/admin/hooks/useSites";
import { CustomQueryGenerationMessage, CustomQueryRow } from "../../../api/analytics/endpoints";
import { useGenerateCustomQuery, useRunCustomQuery } from "../../../api/analytics/hooks/useCustomQuery";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { toast } from "../../../components/ui/sonner";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { cn } from "../../../lib/utils";

SyntaxHighlighter.registerLanguage("sql", sql);

const DEFAULT_QUERY = "";

type QueryTab = {
  id: string;
  name: string;
  prompt: string;
  query: string;
  generationHistory: CustomQueryGenerationMessage[];
  rows: CustomQueryRow[];
  hasRun: boolean;
};

function createQueryTab(index: number): QueryTab {
  return {
    id: `${Date.now()}-${index}`,
    name: `Query ${index}`,
    prompt: "",
    query: DEFAULT_QUERY,
    generationHistory: [],
    rows: [],
    hasRun: false,
  };
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getColumns(rows: CustomQueryRow[]) {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return Array.from(columns);
}

function formatQuery(query: string) {
  try {
    return formatSql(query, {
      language: "sql",
      keywordCase: "upper",
      linesBetweenQueries: 1,
    });
  } catch {
    return query;
  }
}

function QueryEditor({
  value,
  disabled,
  isRunning,
  onChange,
  onFormat,
  onRun,
}: {
  value: string;
  disabled: boolean;
  isRunning: boolean;
  onChange: (value: string) => void;
  onFormat: () => void;
  onRun: () => void;
}) {
  const t = useExtracted();
  const { resolvedTheme } = useTheme();
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, value.split("\n").length);
  const isDark = resolvedTheme === "dark";

  const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollLeft, scrollTop } = event.currentTarget;
    if (highlightRef.current) {
      highlightRef.current.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    }
    if (lineNumberRef.current) {
      lineNumberRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
  };

  return (
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded-lg border border-neutral-150 bg-white shadow-sm dark:border-neutral-850 dark:bg-neutral-900">
      <div className="flex h-10 items-center justify-between border-b border-neutral-150 bg-neutral-50 px-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t("Query")}</div>
          <div className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            SQL
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="smIcon"
            variant="ghost"
            onClick={onFormat}
            disabled={disabled || !value.trim()}
            title="Format query"
            aria-label="Format query"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onRun} disabled={disabled || !value.trim()}>
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {t("Run")}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[42px_minmax(0,1fr)] bg-[#fbfcfd] dark:bg-[#090d16]">
        <div className="relative overflow-hidden border-r border-neutral-150 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
          <div
            ref={lineNumberRef}
            className="select-none px-2 py-2.5 text-right font-mono text-[11px] leading-[18px] text-neutral-400 dark:text-neutral-600"
            aria-hidden="true"
          >
            {Array.from({ length: lineCount }, (_, index) => (
              <div key={index} className="h-[18px]">
                {index + 1}
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[240px] overflow-hidden">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              ref={highlightRef}
              className="min-w-full px-3 py-2.5 font-mono text-[12px] leading-[18px]"
              style={{ width: "max-content" }}
            >
              <SyntaxHighlighter
                language="sql"
                style={isDark ? vs2015 : vs}
                customStyle={{
                  margin: 0,
                  padding: 0,
                  background: "transparent",
                  fontSize: "12px",
                  lineHeight: "18px",
                  overflow: "visible",
                  whiteSpace: "pre",
                }}
                codeTagProps={{
                  style: {
                    fontFamily: "inherit",
                    fontSize: "12px",
                    lineHeight: "18px",
                    whiteSpace: "pre",
                  },
                }}
              >
                {value || " "}
              </SyntaxHighlighter>
            </div>
          </div>
          <textarea
            value={value}
            onChange={event => onChange(event.target.value)}
            onScroll={handleScroll}
            disabled={disabled}
            spellCheck={false}
            wrap="off"
            className={cn(
              "absolute inset-0 min-h-[240px] resize-none overflow-auto border-0 bg-transparent px-3 py-2.5 font-mono text-[12px] leading-[18px] text-transparent outline-none caret-neutral-900",
              "selection:bg-blue-500/20 placeholder:text-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
              "dark:caret-neutral-100 dark:selection:bg-blue-400/25 dark:placeholder:text-neutral-600"
            )}
          />
        </div>
      </div>

      <div className="flex h-7 items-center justify-between border-t border-neutral-150 bg-neutral-50 px-3 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
        <span>{lineCount} lines</span>
        <span>{value.length.toLocaleString()} chars</span>
      </div>
    </div>
  );
}

export default function QueryPage() {
  useSetPageTitle("Query");
  const t = useExtracted();
  const params = useParams<{ site: string }>();
  const siteId = Number(params.site);
  const { data: siteMetadata, isLoading: isLoadingSite } = useGetSite(siteId);
  const organizationId = siteMetadata?.organizationId;

  const [tabs, setTabs] = useState<QueryTab[]>(() => [createQueryTab(1)]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id);

  const runMutation = useRunCustomQuery();
  const generateMutation = useGenerateCustomQuery();
  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
  const columns = useMemo(() => getColumns(activeTab?.rows ?? []), [activeTab?.rows]);

  const updateActiveTab = (updates: Partial<QueryTab>) => {
    if (!activeTab) return;
    setTabs(currentTabs => currentTabs.map(tab => (tab.id === activeTab.id ? { ...tab, ...updates } : tab)));
  };

  const addTab = () => {
    setTabs(currentTabs => {
      const nextTab = createQueryTab(currentTabs.length + 1);
      setActiveTabId(nextTab.id);
      return [...currentTabs, nextTab];
    });
  };

  const closeTab = (tabId: string) => {
    setTabs(currentTabs => {
      if (currentTabs.length === 1) return currentTabs;
      const tabIndex = currentTabs.findIndex(tab => tab.id === tabId);
      const nextTabs = currentTabs.filter(tab => tab.id !== tabId);
      if (tabId === activeTabId) {
        setActiveTabId(nextTabs[Math.max(0, tabIndex - 1)]?.id ?? nextTabs[0]?.id);
      }
      return nextTabs;
    });
  };

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    const prompt = activeTab?.prompt.trim();
    if (!organizationId || !activeTab || !prompt) return;

    try {
      const result = await generateMutation.mutateAsync({
        organizationId,
        prompt,
        currentSiteId: Number.isFinite(siteId) ? siteId : undefined,
        currentQuery: activeTab.query,
        history: activeTab.generationHistory,
      });
      const formattedQuery = formatQuery(result.query);
      const newGenerationMessages: CustomQueryGenerationMessage[] = [
        { role: "user", content: prompt },
        { role: "assistant", content: formattedQuery },
      ];
      const generationHistory = [...activeTab.generationHistory, ...newGenerationMessages].slice(-12);

      updateActiveTab({
        query: formattedQuery,
        generationHistory,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to generate query"));
    }
  };

  const handleRun = async () => {
    if (!organizationId || !activeTab?.query.trim()) return;

    try {
      const result = await runMutation.mutateAsync({ organizationId, query: activeTab.query });
      updateActiveTab({ rows: result.data, hasRun: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to run query"));
    }
  };

  const isBusy = runMutation.isPending || generateMutation.isPending;
  const canUseQuery = !!organizationId && !isLoadingSite;

  return (
    <div className="p-2 md:p-4 mx-auto max-w-[1400px] h-[calc(100vh-96px)] flex flex-col gap-3">
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-neutral-150 bg-neutral-50 p-1 dark:border-neutral-850 dark:bg-neutral-950">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "group flex h-8 min-w-[120px] items-center justify-between gap-2 rounded-md border px-2 text-left text-xs transition-colors",
                isActive
                  ? "border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-750 dark:bg-neutral-900 dark:text-neutral-100"
                  : "border-transparent text-neutral-600 hover:bg-white/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/70 dark:hover:text-neutral-100"
              )}
            >
              <span className="truncate">{tab.name || `Query ${index + 1}`}</span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={event => {
                    event.stopPropagation();
                    closeTab(tab.id);
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
        <Button
          type="button"
          size="smIcon"
          variant="ghost"
          onClick={addTab}
          className="shrink-0"
          aria-label="New query"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleGenerate} className="flex flex-col gap-2 md:flex-row">
        <Input
          value={activeTab?.prompt ?? ""}
          onChange={event => updateActiveTab({ prompt: event.target.value })}
          placeholder={t("What do you want to query?")}
          disabled={!canUseQuery || isBusy}
          className="md:flex-1"
        />
        <Button type="submit" disabled={!canUseQuery || !activeTab?.prompt.trim() || isBusy} className="md:w-auto">
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t("Generate")}
        </Button>
      </form>

      <QueryEditor
        value={activeTab?.query ?? ""}
        disabled={!canUseQuery || isBusy}
        isRunning={runMutation.isPending}
        onChange={query => updateActiveTab({ query })}
        onFormat={() => updateActiveTab({ query: formatQuery(activeTab?.query ?? "") })}
        onRun={handleRun}
      />

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-neutral-150 bg-white dark:border-neutral-850 dark:bg-neutral-900">
        <div className="flex h-10 items-center justify-between border-b border-neutral-100 px-3 dark:border-neutral-850">
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t("Results")}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {activeTab?.hasRun ? t("{count} rows", { count: activeTab.rows.length.toLocaleString() }) : t("Not run")}
          </div>
        </div>

        {columns.length > 0 ? (
          <div className="h-[calc(100%-2.5rem)] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow>
                  {columns.map(column => (
                    <TableHead key={column} className="whitespace-nowrap">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTab?.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map(column => (
                      <TableCell key={column} className="max-w-[320px] truncate whitespace-nowrap font-mono text-xs">
                        {formatCellValue(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-[calc(100%-2.5rem)] items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
            {activeTab?.hasRun ? t("No rows returned") : t("Run a query")}
          </div>
        )}
      </div>
    </div>
  );
}
