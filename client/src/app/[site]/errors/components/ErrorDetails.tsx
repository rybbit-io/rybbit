"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getCountryName } from "@/lib/utils";
import { formatDuration, userLocale, hour12 } from "@/lib/dateTimeUtils";
import { useGetRegionName } from "@/lib/geo";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Code,
  FileText,
  Globe,
  Hash,
  Laptop,
  MapPin,
  Smartphone,
  User,
} from "lucide-react";
import { DateTime } from "luxon";
import { memo } from "react";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import {
  ErrorEvent,
  parseErrorProperties,
  useGetErrorEvents,
} from "@/api/analytics/useGetErrorEvents";

interface ErrorDetailsProps {
  errorName: string;
}

// DeviceIcon component for displaying mobile/desktop icons
function DeviceIcon({ deviceType }: { deviceType: string | null }) {
  if (!deviceType) return <Laptop className="w-4 h-4" />;

  const type = deviceType.toLowerCase();
  if (type.includes("mobile") || type.includes("tablet")) {
    return <Smartphone className="w-4 h-4" />;
  }
  return <Laptop className="w-4 h-4" />;
}

// Function to truncate text for display
function truncateText(text: string | null, maxLength: number = 50) {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

// Component to display individual error event
function ErrorEventItem({ errorEvent }: { errorEvent: ErrorEvent }) {
  const { getRegionName } = useGetRegionName();
  console.log("errorEvent", errorEvent);
  const errorProps = parseErrorProperties(errorEvent.properties);

  const getFullLocation = (event: ErrorEvent) => {
    let location = "";
    if (event.city) {
      location += `${event.city}, `;
    }
    if (event.region && getRegionName(event.region)) {
      location += `${getRegionName(event.region)}, `;
    }
    if (event.country) {
      location += getCountryName(event.country);
    }
    return location || "Unknown location";
  };

  const formatTimestamp = (timestamp: string) => {
    return DateTime.fromSQL(timestamp, { zone: "utc" })
      .setLocale(userLocale)
      .toLocal()
      .toFormat(hour12 ? "MMM d, h:mm:ss a" : "dd MMM, HH:mm:ss");
  };

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900/50">
      {/* Header with timestamp and basic info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium">
            {formatTimestamp(errorEvent.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Session ID */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                <Hash className="w-3 h-3 mr-1" />
                {errorEvent.session_id.substring(0, 8)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Session ID: {errorEvent.session_id}</TooltipContent>
          </Tooltip>

          {/* User ID if available */}
          {errorEvent.user_id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  {errorEvent.user_id.substring(0, 8)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>User ID: {errorEvent.user_id}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Error message */}
      <div className="mb-3">
        <div className="flex items-start gap-2">
          <Code className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-400 mb-1">
              Error Message:
            </p>
            <p className="text-sm text-gray-300 break-words">
              {errorProps.message || "No message available"}
            </p>
          </div>
        </div>
      </div>

      {/* File and line info */}
      {(errorProps.fileName || errorProps.lineNumber) && (
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-400 mb-1">
                Location:
              </p>
              <p className="text-sm text-gray-300 break-words">
                {errorProps.fileName && (
                  <span>{truncateText(errorProps.fileName, 60)}</span>
                )}
                {errorProps.lineNumber && (
                  <span className="text-amber-400">
                    :{errorProps.lineNumber}
                    {errorProps.columnNumber && `:${errorProps.columnNumber}`}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page info */}
      <div className="mb-3">
        <div className="flex items-start gap-2">
          <Globe className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-400 mb-1">Page:</p>
            <p className="text-sm text-gray-300 break-words">
              {errorEvent.hostname && errorEvent.pathname
                ? `${errorEvent.hostname}${errorEvent.pathname}`
                : errorEvent.pathname || errorEvent.hostname || "Unknown page"}
            </p>
            {errorEvent.page_title && (
              <p className="text-xs text-gray-400 mt-1">
                "{truncateText(errorEvent.page_title, 80)}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Browser and device info */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {/* Country */}
        {errorEvent.country && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <CountryFlag country={errorEvent.country} />
                <MapPin className="w-3 h-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getFullLocation(errorEvent)}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Browser */}
        {errorEvent.browser && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Browser browser={errorEvent.browser} />
                <span>{errorEvent.browser}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{errorEvent.browser}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* OS */}
        {errorEvent.operating_system && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <OperatingSystem os={errorEvent.operating_system} />
                <span>{errorEvent.operating_system}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{errorEvent.operating_system}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Device Type */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <DeviceIcon deviceType={errorEvent.device_type} />
              <span>{errorEvent.device_type || "Unknown"}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{errorEvent.device_type || "Unknown device"}</p>
          </TooltipContent>
        </Tooltip>

        {JSON.stringify(errorProps, null, 2)}
      </div>

      {/* Stack trace if available */}
      {errorProps.stack && (
        <div className="mt-3 pt-3 border-t border-neutral-700">
          <div className="flex items-start gap-2">
            <Code className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-400 mb-1">
                Stack Trace:
              </p>
              <pre className="text-xs text-gray-300 bg-neutral-800 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                {errorProps.stack}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorDetails({ errorName }: ErrorDetailsProps) {
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
  } = useGetErrorEvents({
    errorName,
    limit: 10, // Show latest 10 error events
    enabled: !!errorName,
  });

  const errorEvents: ErrorEvent[] | undefined = apiResponse?.data;

  if (isLoading) {
    return (
      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="border border-neutral-800 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-3" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="text-center text-red-400">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p>Error loading error details</p>
          <p className="text-sm text-gray-400">{error?.toString()}</p>
        </div>
      </div>
    );
  }

  if (!errorEvents || errorEvents.length === 0) {
    return (
      <div className="p-4 bg-neutral-900 border-t border-neutral-800">
        <div className="text-center text-gray-400">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p>No error events found</p>
          <p className="text-sm">
            This error may have occurred outside the current time range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-neutral-900 border-t border-neutral-800">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-300">
          Recent Error Events ({errorEvents.length})
        </h4>
        <p className="text-xs text-gray-400">
          Showing the latest error occurrences for this error type
        </p>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {errorEvents.map((errorEvent, index) => (
          <ErrorEventItem
            key={`${errorEvent.session_id}-${errorEvent.timestamp}-${index}`}
            errorEvent={errorEvent}
          />
        ))}
      </div>
    </div>
  );
}

export const ErrorDetailsSkeleton = memo(() => {
  return (
    <div className="p-4 bg-neutral-900 border-t border-neutral-800">
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border border-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
