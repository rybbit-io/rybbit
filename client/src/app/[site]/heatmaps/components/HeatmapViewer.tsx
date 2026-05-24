"use client";

import { Loader2, MousePointerClick } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetClickHeatmap } from "../../../../api/analytics/hooks/heatmap/useGetClickHeatmap";
import { HeatmapCanvas } from "../../../../components/heatmap/HeatmapCanvas";
import { ViewportBreakpoint } from "../../../../api/analytics/endpoints/heatmap";

interface HeatmapViewerProps {
  pathname: string;
  baseUrl: string;
  viewportBreakpoint: ViewportBreakpoint;
  width: number;
  height: number;
}

export function HeatmapViewer({ pathname, baseUrl, viewportBreakpoint, width, height }: HeatmapViewerProps) {
  const { data, isLoading, error } = useGetClickHeatmap({
    pathname,
    viewportBreakpoint,
    gridResolution: 100,
  });

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Construct full page URL
  const pageUrl = useMemo(() => {
    try {
      const url = new URL(pathname, baseUrl);
      return url.toString();
    } catch {
      return `${baseUrl}${pathname}`;
    }
  }, [pathname, baseUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <p className="text-sm text-red-500">Failed to load heatmap data</p>
        <p className="text-xs text-neutral-400 mt-1">{error.message}</p>
      </div>
    );
  }

  const points = data?.data.points ?? [];
  const totalClicks = data?.data.totalClicks ?? 0;
  const uniqueSessions = data?.data.uniqueSessions ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-t-lg border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2 text-sm">
          <MousePointerClick className="w-4 h-4 text-neutral-500" />
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {totalClicks.toLocaleString()}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">clicks</span>
        </div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          from <span className="font-medium text-neutral-700 dark:text-neutral-300">{uniqueSessions.toLocaleString()}</span> sessions
        </div>
      </div>

      {/* Heatmap visualization */}
      <div className="flex-1 relative bg-white dark:bg-neutral-950 rounded-b-lg overflow-hidden">
        {/* Iframe with page preview */}
        <iframe
          src={pageUrl}
          width={width}
          height={height - 48}
          className="w-full h-full"
          style={{
            pointerEvents: "none",
            opacity: iframeLoaded && !iframeError ? 1 : 0.3,
          }}
          sandbox="allow-same-origin"
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeError(true)}
          title="Page Preview"
        />

        {/* Heatmap overlay */}
        {points.length > 0 && (
          <HeatmapCanvas points={points} width={width} height={height - 48} gridResolution={100} />
        )}

        {/* No data overlay */}
        {points.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 text-center shadow-lg">
              <MousePointerClick className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">No click data for this page</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Click data will appear once users interact with this page
              </p>
            </div>
          </div>
        )}

        {/* Loading overlay for iframe */}
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        )}

        {/* Error overlay for iframe */}
        {iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
            <div className="text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Unable to preview page
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                The page may block iframe embedding
              </p>
              {/* Still show heatmap data even without page preview */}
              {points.length > 0 && (
                <div className="mt-4">
                  <HeatmapCanvas points={points} width={width} height={height - 48} gridResolution={100} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
