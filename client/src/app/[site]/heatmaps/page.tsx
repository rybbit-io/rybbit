"use client";

import { useMeasure, useWindowSize } from "@uidotdev/usehooks";
import { Flame } from "lucide-react";
import { useState } from "react";
import { useGetSite } from "../../../api/admin/hooks/useSites";
import { useGetHeatmapPages } from "../../../api/analytics/hooks/heatmap/useGetHeatmapPages";
import { ViewportBreakpoint } from "../../../api/analytics/endpoints/heatmap";
import { NothingFound } from "../../../components/NothingFound";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { HeatmapControls } from "./components/HeatmapControls";
import { HeatmapPageList } from "./components/HeatmapPageList";
import { HeatmapViewer } from "./components/HeatmapViewer";

export default function HeatmapsPage() {
  useSetPageTitle("Rybbit · Heatmaps");

  const { site } = useStore();
  const { data: siteData } = useGetSite(site);
  const { data: pagesData, isLoading: isPagesLoading } = useGetHeatmapPages();

  console.info(pagesData);

  const [selectedPathname, setSelectedPathname] = useState<string | null>(null);
  const [viewportBreakpoint, setViewportBreakpoint] = useState<ViewportBreakpoint>("all");

  const [ref, { width: containerWidth }] = useMeasure();
  const { height: windowHeight } = useWindowSize();

  const pages = pagesData?.data ?? [];
  const hasNoPages = !isPagesLoading && pages.length === 0;

  // Use first page as default if none selected
  const activePathname = selectedPathname ?? pages[0]?.pathname ?? null;

  // Build base URL from site domain
  const baseUrl = siteData?.domain ? `https://${siteData.domain}` : "";

  return (
    <div className="p-2 md:p-4 max-w-[2000px] mx-auto flex flex-col gap-2 h-dvh overflow-hidden">
      <SubHeader />

      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Click Heatmaps</h1>
        <HeatmapControls viewportBreakpoint={viewportBreakpoint} onViewportChange={setViewportBreakpoint} />
      </div>

      {hasNoPages ? (
        <NothingFound
          icon={<Flame className="w-10 h-10" />}
          title="No heatmap data found"
          description="Click data will appear here once session replay captures user interactions."
        />
      ) : (
        <div className="grid grid-cols-[250px_1fr] gap-4 flex-1 min-h-0">
          {/* Page list sidebar */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-2 overflow-hidden">
            <HeatmapPageList
              pages={pages}
              selectedPathname={activePathname}
              onSelectPage={setSelectedPathname}
              isLoading={isPagesLoading}
            />
          </div>

          {/* Heatmap viewer */}
          <div
            ref={ref}
            className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
          >
            {activePathname && containerWidth && windowHeight && baseUrl ? (
              <HeatmapViewer
                pathname={activePathname}
                baseUrl={baseUrl}
                viewportBreakpoint={viewportBreakpoint}
                width={containerWidth}
                height={windowHeight - 180}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500 dark:text-neutral-400">
                {!baseUrl ? "Loading site data..." : "Select a page to view heatmap"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
