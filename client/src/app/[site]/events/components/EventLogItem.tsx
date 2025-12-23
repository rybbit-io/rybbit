"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTimezone } from "@/lib/store";
import { ExternalLink, Eye, Laptop, MousePointerClick, Smartphone } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { memo } from "react";
import { Event } from "../../../../api/analytics/endpoints";
import { getCountryName } from "../../../../lib/utils";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import { EventIcon, PageviewIcon } from "../../../../components/EventIcons";

// DeviceIcon component for displaying mobile/desktop icons
function DeviceIcon({ deviceType }: { deviceType: string }) {
  const type = deviceType.toLowerCase();

  if (type.includes("mobile") || type.includes("tablet")) {
    return <Smartphone className="w-4 h-4" />;
  }

  return <Laptop className="w-4 h-4" />;
}

// Function to truncate path for display
function truncatePath(path: string, maxLength: number = 64) {
  if (!path) return "-";
  if (path.length <= maxLength) return path;

  // Keep the beginning of the path with ellipsis
  return `${path.substring(0, maxLength)}...`;
}

interface EventLogItemProps {
  event: Event;
}

export function EventLogItem({ event }: EventLogItemProps) {
  const { site } = useParams();

  // Parse event timestamp
  const eventTime = DateTime.fromSQL(event.timestamp, {
    zone: "utc",
  }).setZone(getTimezone());

  // Determine event type
  const isPageview = event.type === "pageview";
  const isOutbound = event.type === "outbound";

  const fullPath = `https://${event.hostname}${event.pathname}${event.querystring ? `${event.querystring}` : ""}`;

  // Parse event properties if they exist
  let eventProperties: Record<string, any> = {};
  if (event.properties && event.properties !== "{}") {
    try {
      eventProperties = JSON.parse(event.properties);
    } catch (e) {
      console.error("Failed to parse event properties:", e);
    }
  }

  return (
    <div className="mb-3 rounded-lg bg-neutral-50 dark:bg-neutral-850/50 border border-neutral-100 dark:border-neutral-800 overflow-hidden p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-all duration-200">
      <div className="flex flex-col space-y-2">
        {/* Single row with event type, name/path, device info, and timestamp */}
        <div className="flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100">
          {/* Left side content */}
          <div className="flex items-center gap-2 grow min-w-0">
            {/* Event type icon */}
            <div className="shrink-0">
              {isPageview ? (
                <PageviewIcon />
              ) : isOutbound ? (
                <ExternalLink className="w-4 h-4 text-purple-500" />
              ) : (
                <EventIcon />
              )}
            </div>

            {/* Event name or path */}
            <div className="min-w-0 max-w-[40%]">
              {isPageview ? (
                <Link href={fullPath} target="_blank" rel="noopener noreferrer">
                  <div className="text-sm truncate hover:underline" title={event.pathname}>
                    {truncatePath(`${event.pathname}${event.querystring ? `${event.querystring}` : ""}`)}
                  </div>
                </Link>
              ) : isOutbound ? (
                // For outbound events, show the destination URL from properties
                eventProperties.url ? (
                  <Link href={eventProperties.url} target="_blank" rel="noopener noreferrer">
                    <div className="text-sm truncate hover:underline text-purple-400" title={eventProperties.url}>
                      {truncatePath(eventProperties.url)}
                    </div>
                  </Link>
                ) : (
                  <div className="text-sm font-medium truncate text-purple-400">Outbound Link</div>
                )
              ) : (
                <div className="text-sm font-medium truncate">{event.event_name}</div>
              )}
            </div>

            {/* Device info */}
            <div className="shrink-0 flex space-x-1 items-center">
              {event.country && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <CountryFlag country={event.country} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getCountryName(event.country)}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Browser browser={event.browser || "Unknown"} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{event.browser || "Unknown browser"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <OperatingSystem os={event.operating_system || ""} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{event.operating_system || "Unknown OS"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DeviceIcon deviceType={event.device_type || ""} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{event.device_type || "Unknown device"}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* User ID */}
            <Link href={`/${site}/user/${event.user_id}`} className="shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300">
                    {event.user_id.substring(0, 12)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View user profile</p>
                </TooltipContent>
              </Tooltip>
            </Link>
          </div>

          {/* Timestamp (right-aligned) */}
          <div className="text-sm shrink-0 text-neutral-500 dark:text-neutral-400 ml-auto">
            {eventTime.toRelative()}
          </div>
        </div>

        {/* Bottom row with event properties */}
        {Object.keys(eventProperties).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 ml-6">
            {Object.entries(eventProperties).map(([key, value]) => (
              <Badge
                key={key}
                variant="outline"
                className="px-1.5 py-0 h-5 text-xs bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium truncate max-w-[90%]"
              >
                <span className="text-neutral-600 dark:text-neutral-300 font-light mr-1">{key}:</span>{" "}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="max-w-7xl">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const EventLogItemSkeleton = memo(() => {
  // Function to get a random width class for skeletons
  const getRandomWidth = () => {
    const widths = ["w-16", "w-20", "w-24", "w-28", "w-32", "w-36", "w-40"];
    return widths[Math.floor(Math.random() * widths.length)];
  };

  return (
    <div className="mb-3 rounded-lg bg-neutral-50 dark:bg-neutral-850/50 border border-neutral-100 dark:border-neutral-800 overflow-hidden p-3">
      <div className="flex flex-col space-y-2">
        {/* Single row skeleton */}
        <div className="flex items-center gap-2">
          {/* Left side content */}
          <div className="flex items-center gap-2 grow">
            <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded-sm animate-pulse shrink-0"></div>
            <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse shrink-0"></div>
            <div className="flex space-x-1 shrink-0">
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded-sm animate-pulse"></div>
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded-sm animate-pulse"></div>
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded-sm animate-pulse"></div>
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded-sm animate-pulse"></div>
            </div>
            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse shrink-0"></div>
          </div>

          {/* Timestamp (right-aligned) */}
          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse shrink-0 ml-auto"></div>
        </div>

        {/* Bottom row skeleton (properties) - show randomly */}
        {Math.random() > 0.5 && (
          <div className="flex flex-wrap gap-1 mt-1 ml-6">
            {Array.from({ length: Math.floor(Math.random() * 4) + 1 }).map((_, i) => (
              <div
                key={i}
                className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse"
                style={{ width: `${Math.random() * 60 + 40}px` }}
              ></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
