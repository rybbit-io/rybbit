"use client";

import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { useGetSite } from "../../../api/admin/hooks/useSites";
import { useGenerateCustomQuery, useRunCustomQuery } from "../../../api/analytics/hooks/useCustomQuery";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { QueryEditor } from "./components/QueryEditor";
import { QueryPromptForm } from "./components/QueryPromptForm";
import { QueryTabs } from "./components/QueryTabs";
import { ResultsPanel } from "./components/ResultsPanel";
import type { QueryTab } from "./types";
import { useHiddenTabTitle } from "./useHiddenTabTitle";
import { getRunningKeys, useRunTracker } from "./useRunTracker";
import { createQueryTab, formatQuery, getColumns, getErrorMessage, sortRows } from "./utils";

export default function QueryPage() {
  useSetPageTitle("Query");
  const t = useExtracted();
  const params = useParams<{ site: string }>();
  const siteId = Number(params.site);
  const { data: siteMetadata, isLoading: isLoadingSite } = useGetSite(siteId);
  const organizationId = siteMetadata?.organizationId;

  const [tabs, setTabs] = useState<QueryTab[]>(() => [createQueryTab(1)]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id);
  const queryRuns = useRunTracker();
  const generations = useRunTracker();
  const notifyIfHidden = useHiddenTabTitle();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const runMutation = useRunCustomQuery();
  const generateMutation = useGenerateCustomQuery();
  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
  const columns = useMemo(() => getColumns(activeTab?.rows ?? []), [activeTab?.rows]);
  const activeSort = activeTab?.sort && columns.includes(activeTab.sort.column) ? activeTab.sort : null;
  const sortedRows = useMemo(() => sortRows(activeTab?.rows ?? [], activeSort), [activeTab?.rows, activeSort]);
  const runningTabIds = useMemo(() => getRunningKeys(queryRuns.runs), [queryRuns.runs]);
  const generatingTabIds = useMemo(() => getRunningKeys(generations.runs), [generations.runs]);
  const activeRun = activeTab ? queryRuns.runs[activeTab.id] : undefined;
  const activeGeneration = activeTab ? generations.runs[activeTab.id] : undefined;
  const activeTabIsRunning = activeRun?.status === "running";
  const activeTabIsGenerating = activeGeneration?.status === "running";
  const activeTabIsBusy = activeTabIsRunning || activeTabIsGenerating;

  const updateTab = (tabId: string, updates: Partial<QueryTab>) => {
    setTabs(currentTabs => currentTabs.map(tab => (tab.id === tabId ? { ...tab, ...updates } : tab)));
  };

  const updateActiveTab = (updates: Partial<QueryTab>) => {
    if (!activeTab) return;
    updateTab(activeTab.id, updates);
  };

  const addTab = () => {
    setTabs(currentTabs => {
      const nextTab = createQueryTab(currentTabs.length + 1);
      setActiveTabId(nextTab.id);
      return [...currentTabs, nextTab];
    });
  };

  const closeTab = (tabId: string) => {
    generations.remove(tabId);
    queryRuns.remove(tabId);

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

  const handleGenerate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = activeTab?.prompt.trim();
    if (!organizationId || !activeTab || !prompt || generations.isRunning(activeTab.id)) return;

    const tab = activeTab;
    updateTab(tab.id, { resultError: null });

    void generations.start(
      tab.id,
      signal =>
        generateMutation.mutateAsync({
          organizationId,
          prompt,
          currentSiteId: Number.isFinite(siteId) ? siteId : undefined,
          currentQuery: tab.query,
          history: tab.generationHistory,
          signal,
        }),
      {
        onDone: result => {
          const formattedQuery = formatQuery(result.query);
          const newGenerationMessages: QueryTab["generationHistory"] = [
            { role: "user", content: prompt },
            { role: "assistant", content: formattedQuery },
          ];
          const generationHistory = [...tab.generationHistory, ...newGenerationMessages].slice(-12);

          updateTab(tab.id, {
            query: formattedQuery,
            generationHistory,
            resultError: null,
          });
        },
        onFailed: error => {
          updateTab(tab.id, {
            resultError: getErrorMessage(error, t("Failed to generate query")),
          });
        },
      }
    );
  };

  // Results, errors and the previous run's rows stay untouched until the run settles, so a
  // cancelled run falls back to exactly what the tab showed before.
  const handleRun = () => {
    if (!organizationId || !activeTab?.query.trim() || queryRuns.isRunning(activeTab.id)) return;

    const tab = activeTab;

    void queryRuns.start(
      tab.id,
      signal =>
        runMutation.mutateAsync({
          organizationId,
          query: tab.query,
          siteId: Number.isFinite(siteId) ? siteId : undefined,
          signal,
        }),
      {
        onDone: result => {
          updateTab(tab.id, { rows: result.data, hasRun: true, resultError: null });
          notifyIfHidden(`✓ ${t("Query done")}`);
        },
        onFailed: error => {
          updateTab(tab.id, {
            rows: [],
            hasRun: true,
            resultError: getErrorMessage(error, t("Failed to run query")),
          });
          notifyIfHidden(t("Query failed"));
        },
      }
    );
  };

  const canUseQuery = !!organizationId && !isLoadingSite;

  return (
    <div className="p-2 md:p-4 mx-auto max-w-[1400px] h-[calc(100vh-96px)] flex flex-col gap-3">
      <QueryTabs
        tabs={tabs}
        activeTabId={activeTab?.id}
        runningTabIds={runningTabIds}
        generatingTabIds={generatingTabIds}
        onSelectTab={setActiveTabId}
        onCloseTab={closeTab}
        onAddTab={addTab}
      />

      <QueryPromptForm
        prompt={activeTab?.prompt ?? ""}
        canUseQuery={canUseQuery}
        isBusy={activeTabIsBusy}
        isGenerating={activeTabIsGenerating}
        generationStartedAt={activeGeneration?.status === "running" ? activeGeneration.startedAt : null}
        onPromptChange={prompt => updateActiveTab({ prompt })}
        onGenerate={handleGenerate}
        onCancelGenerate={() => {
          if (activeTab) generations.cancel(activeTab.id);
        }}
      />

      <QueryEditor
        value={activeTab?.query ?? ""}
        disabled={!canUseQuery || activeTabIsGenerating}
        readOnly={activeTabIsRunning}
        textareaRef={editorRef}
        isRunning={activeTabIsRunning}
        onChange={query => updateActiveTab({ query })}
        onFormat={() => updateActiveTab({ query: formatQuery(activeTab?.query ?? "") })}
        onRun={handleRun}
      />

      <ResultsPanel
        activeTab={activeTab}
        run={activeRun}
        columns={columns}
        rows={sortedRows}
        sort={activeSort}
        onSortChange={sort => updateActiveTab({ sort })}
        onCancelRun={() => {
          if (!activeTab) return;
          queryRuns.cancel(activeTab.id);
          // The Cancel button unmounts with the loader; hand focus back to the SQL being tuned.
          editorRef.current?.focus();
        }}
      />
    </div>
  );
}
