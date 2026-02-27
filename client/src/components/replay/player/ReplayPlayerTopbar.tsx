import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useGetSessionReplayEvents } from "@/api/analytics/hooks/sessionReplay/useGetSessionReplayEvents";
import {
  BrowserTooltipIcon,
  CountryFlagTooltipIcon,
  DeviceTypeTooltipIcon,
  OperatingSystemTooltipIcon,
} from "@/components/TooltipIcons/TooltipIcons";
import { useReplayStore } from "../replayStore";

export function ReplayPlayerTopbar() {
  const params = useParams();
  const siteId = Number(params.site);
  const { sessionId, currentTime } = useReplayStore();

  const { data } = useGetSessionReplayEvents(siteId, sessionId);

  const { metadata } = data ?? {};
  const screenDimensions = `${metadata?.screen_width} × ${metadata?.screen_height}`;

  const pageViewEvents = useMemo(() => {
    return data?.events?.filter(event => event.type === 4);
  }, [data?.events]);

  // Get the current page URL based on the replay currentTime
  const pageUrl = useMemo(() => {
    if (!pageViewEvents || currentTime === 0) {
      return metadata?.page_url;
    }

    let currentUrl = metadata?.page_url;
    const firstTimestamp = pageViewEvents[0].timestamp;

    // Find the most recent Meta event (type 4) with href before currentTime
    for (const event of pageViewEvents) {
      if (event.timestamp - firstTimestamp > currentTime) break;
      if (event.data?.href) {
        currentUrl = event.data.href;
      }
    }

    return currentUrl;
  }, [pageViewEvents, currentTime, metadata?.page_url]);

  if (!pageUrl || !metadata) {
    return (
      <div className="border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 py-2 rounded-t-lg overflow-hidden">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-4 w-32 bg-neutral-150 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <div className="h-4 w-24 bg-neutral-150 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Extract pathname from full URL for display
  const getDisplayPath = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      return url;
    }
  };

  return (
    <div className="border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 py-2 rounded-t-lg overflow-hidden">
      <div className="flex items-center justify-between min-w-0">
        {/* Left side: Page path with external link */}
        <Link
          className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex-1 min-w-0 flex items-center hover:underline"
          href={pageUrl}
          target="_blank"
          title={`Open ${pageUrl} in new tab`}
        >
          {getDisplayPath(pageUrl)}
        </Link>

        {/* Right side: Screen dimensions */}
        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 shrink-0 ml-2">
          <CountryFlagTooltipIcon
            country={metadata.country}
            city={metadata.city}
            region={metadata.region}
            className="w-4 h-4"
          />
          <BrowserTooltipIcon browser={metadata.browser} browser_version={metadata.browser_version} size={13} />
          <OperatingSystemTooltipIcon
            operating_system={metadata.operating_system}
            operating_system_version={metadata.operating_system_version}
            size={13}
          />
          <DeviceTypeTooltipIcon
            device_type={metadata.device_type}
            screen_width={metadata.screen_width}
            screen_height={metadata.screen_height}
            size={16}
          />

          <span className="whitespace-nowrap">{screenDimensions}</span>
        </div>
      </div>
    </div>
  );
}
