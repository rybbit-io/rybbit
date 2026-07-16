"use client";

import { useExtracted } from "next-intl";
import { ErrorEvent } from "@/api/analytics/endpoints";
import { useGetErrorEventsInfinite } from "@/api/analytics/hooks/errors/useGetErrorEvents";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { useGetRegionName } from "@/lib/geo";
import { getTimezone } from "@/lib/store";
import { getCountryName, truncateString } from "@/lib/utils";
import { AlertTriangle, Code, Loader2, TriangleAlert } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Avatar } from "../../../../components/Avatar";
import { ErrorState } from "../../../../components/ErrorState";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import { DeviceIcon } from "../../components/shared/icons/Device";

interface ErrorDetailsProps {
  errorMessage: string;
}

// Component to display individual error event
function ErrorEventItem({ errorEvent }: { errorEvent: ErrorEvent }) {
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();
  const { getRegionName } = useGetRegionName();
  const { site } = useParams();

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
    return location || t("Unknown location");
  };

  return (
    <div className="border border-neutral-100 dark:border-neutral-850 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-900/50">
      {/* Header with timestamp and basic info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-700 dark:text-neutral-200">
            {formatRelative(DateTime.fromSQL(errorEvent.timestamp, { zone: "utc" }).setZone(getTimezone()))}
          </span>
          <div className="flex items-center gap-2">
            {errorEvent.country && (
              <Tooltip>
                <TooltipTrigger>
                  <CountryFlag country={errorEvent.country} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getFullLocation(errorEvent)}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {errorEvent.browser && (
              <Tooltip>
                <TooltipTrigger>
                  <Browser browser={errorEvent.browser} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {errorEvent.browser}
                    {errorEvent.browser_version && ` ${errorEvent.browser_version}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            {errorEvent.operating_system && (
              <Tooltip>
                <TooltipTrigger>
                  <OperatingSystem os={errorEvent.operating_system} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {errorEvent.operating_system}
                    {errorEvent.operating_system_version && ` ${errorEvent.operating_system_version}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger>
                <DeviceIcon deviceType={errorEvent.device_type ?? ""} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{errorEvent.device_type || t("Unknown device")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Link
            href={`https://${errorEvent.hostname}${errorEvent.pathname}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 dark:text-neutral-300 wrap-break-word hover:underline"
          >
            {errorEvent.hostname && errorEvent.pathname
              ? `${errorEvent.hostname}${errorEvent.pathname}`
              : errorEvent.pathname || errorEvent.hostname || t("Unknown page")}
          </Link>
        </div>
        <div className="flex items-center gap-2">


          {errorEvent.user_id && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/${site}/user/${encodeURIComponent(errorEvent.user_id)}`}>
                  <Avatar
                    size={24}
                    id={errorEvent.user_id}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent>User ID: {errorEvent.user_id}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Error message */}
      <div className="mb-3">
        <div className="flex items-start gap-2 text-red-400">
          <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-1">{t("Error")}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 wrap-break-word">
              {errorEvent.message || t("No message available")}
            </p>
          </div>
        </div>
      </div>

      {/* Stack trace if available */}
      {errorEvent.stack && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-850">
          <div className="flex items-start gap-2">
            <Code className="w-4 h-4 text-neutral-900 dark:text-neutral-100 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">{t("Stack Trace:")}</p>
              {/* File and line info */}
              {(errorEvent.fileName || errorEvent.lineNumber) && (
                <div className="mb-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`${errorEvent.fileName}`}
                      className="text-sm text-neutral-600 dark:text-neutral-300 wrap-break-word hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {errorEvent.fileName && <span>{truncateString(errorEvent.fileName, 100)}</span>}
                      {errorEvent.lineNumber && (
                        <span className="text-neutral-900 dark:text-neutral-100">
                          :{errorEvent.lineNumber}
                          {errorEvent.columnNumber && `:${errorEvent.columnNumber}`}
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              )}
              <pre className="text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-800 p-2 rounded overflow-x-auto whitespace-pre-wrap wrap-break-word">
                {errorEvent.stack}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorDetails({ errorMessage }: ErrorDetailsProps) {
  const t = useExtracted();
  const {
    data: errorEventsData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetErrorEventsInfinite(errorMessage, !!errorMessage);

  // Flatten all error events into a single array
  const allErrorEvents = useMemo(() => {
    if (!errorEventsData?.pages) return [];
    return errorEventsData.pages.flatMap(page => page.data?.data || []);
  }, [errorEventsData?.pages]);

  // Get total count from the first page
  const totalCount = errorEventsData?.pages?.[0]?.data?.totalCount || 0;

  if (isLoading) {
    return (
      <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-850">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="border border-neutral-100 dark:border-neutral-850 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-900/50"
            >
              {/* Header with timestamp and icons */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" /> {/* Timestamp */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" /> {/* Country flag */}
                    <Skeleton className="h-4 w-4 rounded" /> {/* Browser icon */}
                    <Skeleton className="h-4 w-4 rounded" /> {/* OS icon */}
                    <Skeleton className="h-4 w-4 rounded" /> {/* Device icon */}
                  </div>
                  <Skeleton className="h-4 w-48" /> {/* URL */}
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" /> {/* User badge */}
                </div>
              </div>

              {/* Error message section */}
              <div className="mb-3">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 mt-0.5" /> {/* Error icon */}
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-12 mb-1" /> {/* "Error" label */}
                    <Skeleton className="h-4 w-full mb-1" /> {/* Error message line 1 */}
                    <Skeleton className="h-4 w-3/4" /> {/* Error message line 2 */}
                  </div>
                </div>
              </div>

              {/* Stack trace section (randomly show/hide) */}
              {Math.random() > 0.5 && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-850">
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-4 w-4 mt-0.5" /> {/* Code icon */}
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-20 mb-1" /> {/* "Stack Trace:" label */}
                      <Skeleton className="h-4 w-64 mb-2" /> {/* File name and line */}
                      <Skeleton className="h-16 w-full rounded" /> {/* Stack trace code block */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title={t("Failed to load errors")}
        message={t("There was a problem fetching the errors. Please try again later.")}
      />
    );
  }

  if (!allErrorEvents || allErrorEvents.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-850">
        <div className="text-center text-neutral-500 dark:text-neutral-400">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p>{t("No error events found")}</p>
          <p className="text-sm">{t("This error may have occurred outside the current time range.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-850 space-y-3 max-h-[70vh] overflow-y-auto">
      {allErrorEvents.map((errorEvent, index) => (
        <ErrorEventItem key={`${errorEvent.session_id}-${errorEvent.timestamp}-${index}`} errorEvent={errorEvent} />
      ))}

      {hasNextPage && (
        <div className="flex justify-center mt-6 mb-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("Loading...")}</span>
              </>
            ) : (
              <span>{t("Load More")}</span>
            )}
          </Button>
        </div>
      )}

      {totalCount > 0 && (
        <div className="text-center text-xs text-neutral-500 dark:text-neutral-500 mt-2">
          {t("Showing {shown} of {total} error events", { shown: String(allErrorEvents.length), total: String(totalCount) })}
        </div>
      )}
    </div>
  );
}
