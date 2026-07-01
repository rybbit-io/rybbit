"use client";

import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGetSite } from "../../../api/admin/hooks/useSites";
import { useGenerateCustomQuery, useRunCustomQuery } from "../../../api/analytics/hooks/useCustomQuery";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { QueryEditor } from "./components/QueryEditor";
import { QueryPromptForm } from "./components/QueryPromptForm";
import { QueryTabs } from "./components/QueryTabs";
import { ResultsPanel } from "./components/ResultsPanel";
import type { QueryTab } from "./types";
import { createQueryTab, formatQuery, getColumns, getErrorMessage, isAbortError, sortRows } from "./utils";

export default function QueryPage() {
  useSetPageTitle("Query");
  const t = useExtracted();
  const params = useParams<{ site: string }>();
  const siteId = Number(params.site);
  const { data: siteMetadata, isLoading: isLoadingSite } = useGetSite(siteId);
  const organizationId = siteMetadata?.organizationId;

  const [tabs, setTabs] = useState<QueryTab[]>(() => [createQueryTab(1)]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id);
  const [runningTabIds, setRunningTabIds] = useState<Set<string>>(() => new Set());
  const [generatingTabIds, setGeneratingTabIds] = useState<Set<string>>(() => new Set());
  const generateAbortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const runMutation = useRunCustomQuery();
  const generateMutation = useGenerateCustomQuery();
  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
  const columns = useMemo(() => getColumns(activeTab?.rows ?? []), [activeTab?.rows]);
  const activeSort = activeTab?.sort && columns.includes(activeTab.sort.column) ? activeTab.sort : null;
  const sortedRows = useMemo(() => sortRows(activeTab?.rows ?? [], activeSort), [activeTab?.rows, activeSort]);
  const activeTabIsRunning = activeTab ? runningTabIds.has(activeTab.id) : false;
  const activeTabIsGenerating = activeTab ? generatingTabIds.has(activeTab.id) : false;
  const activeTabIsBusy = activeTabIsRunning || activeTabIsGenerating;

  const updateTab = (tabId: string, updates: Partial<QueryTab>) => {
    setTabs(currentTabs => currentTabs.map(tab => (tab.id === tabId ? { ...tab, ...updates } : tab)));
  };

  const updateActiveTab = (updates: Partial<QueryTab>) => {
    if (!activeTab) return;
    updateTab(activeTab.id, updates);
  };

  const setTabRunning = (tabId: string, isRunning: boolean) => {
    setRunningTabIds(currentIds => {
      const nextIds = new Set(currentIds);
      if (isRunning) {
        nextIds.add(tabId);
      } else {
        nextIds.delete(tabId);
      }
      return nextIds;
    });
  };

  const setTabGenerating = (tabId: string, isGenerating: boolean) => {
    setGeneratingTabIds(currentIds => {
      const nextIds = new Set(currentIds);
      if (isGenerating) {
        nextIds.add(tabId);
      } else {
        nextIds.delete(tabId);
      }
      return nextIds;
    });
  };

  const addTab = () => {
    setTabs(currentTabs => {
      const nextTab = createQueryTab(currentTabs.length + 1);
      setActiveTabId(nextTab.id);
      return [...currentTabs, nextTab];
    });
  };

  const closeTab = (tabId: string) => {
    generateAbortControllersRef.current.get(tabId)?.abort();
    generateAbortControllersRef.current.delete(tabId);
    setTabGenerating(tabId, false);
    setTabRunning(tabId, false);

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

  useEffect(() => {
    return () => {
      generateAbortControllersRef.current.forEach(controller => controller.abort());
      generateAbortControllersRef.current.clear();
    };
  }, []);

  const abortActiveGeneration = () => {
    if (!activeTab) return;
    generateAbortControllersRef.current.get(activeTab.id)?.abort();
    generateAbortControllersRef.current.delete(activeTab.id);
    setTabGenerating(activeTab.id, false);
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = activeTab?.prompt.trim();
    if (!organizationId || !activeTab || !prompt) return;

    const tab = activeTab;
    generateAbortControllersRef.current.get(tab.id)?.abort();
    const abortController = new AbortController();
    generateAbortControllersRef.current.set(tab.id, abortController);
    setTabGenerating(tab.id, true);
    updateTab(tab.id, { resultError: null });

    try {
      const result = await generateMutation.mutateAsync({
        organizationId,
        prompt,
        currentSiteId: Number.isFinite(siteId) ? siteId : undefined,
        currentQuery: tab.query,
        history: tab.generationHistory,
        signal: abortController.signal,
      });
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
    } catch (error) {
      if (isAbortError(error)) return;
      updateTab(tab.id, {
        resultError: getErrorMessage(error, t("Failed to generate query")),
      });
    } finally {
      if (generateAbortControllersRef.current.get(tab.id) === abortController) {
        generateAbortControllersRef.current.delete(tab.id);
      }
      setTabGenerating(tab.id, false);
    }
  };

  const handleRun = async () => {
    if (!organizationId || !activeTab?.query.trim()) return;

    const tab = activeTab;
    setTabRunning(tab.id, true);
    updateTab(tab.id, { resultError: null });

    try {
      const result = await runMutation.mutateAsync({ organizationId, query: tab.query });
      updateTab(tab.id, { rows: result.data, hasRun: true, resultError: null });
    } catch (error) {
      updateTab(tab.id, {
        rows: [],
        hasRun: true,
        resultError: getErrorMessage(error, t("Failed to run query")),
      });
    } finally {
      setTabRunning(tab.id, false);
    }
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
        onPromptChange={prompt => updateActiveTab({ prompt })}
        onGenerate={handleGenerate}
        onCancelGenerate={abortActiveGeneration}
      />

      <QueryEditor
        value={activeTab?.query ?? ""}
        disabled={!canUseQuery || activeTabIsBusy}
        isRunning={activeTabIsRunning}
        onChange={query => updateActiveTab({ query })}
        onFormat={() => updateActiveTab({ query: formatQuery(activeTab?.query ?? "") })}
        onRun={handleRun}
      />

      <ResultsPanel
        activeTab={activeTab}
        columns={columns}
        rows={sortedRows}
        sort={activeSort}
        onSortChange={sort => updateActiveTab({ sort })}
      />
    </div>
  );
}
