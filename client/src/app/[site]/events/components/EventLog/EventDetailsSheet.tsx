"use client";

import { useExtracted } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import Link from "next/link";
import { Event } from "../../../../../api/analytics/endpoints";
import { fetchSessions } from "../../../../../api/analytics/endpoints/sessions";
import { EventTypeIcon } from "../../../../../components/EventIcons";
import { SessionCard, SessionCardSkeleton } from "../../../../../components/Sessions/SessionCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../../../../components/ui/sheet";
import { hour12, userLocale } from "../../../../../lib/dateTimeUtils";
import { getRegionName } from "../../../../../lib/geo";
import { getTimezone } from "../../../../../lib/store";
import { getCountryName, getUserDisplayName, truncateString } from "../../../../../lib/utils";
import { Browser } from "../../../components/shared/icons/Browser";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { DeviceIcon } from "../../../components/shared/icons/Device";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { buildEventPath, getEventTypeLabel, parseEventProperties } from "./eventLogUtils";

interface EventDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  site: string;
}

export function EventDetailsSheet({ open, onOpenChange, event, site }: EventDetailsSheetProps) {
  const t = useExtracted();
  const selectedEventProperties = event ? parseEventProperties(event) : {};

  const sessionQuery = useQuery({
    queryKey: ["event-session", site, event?.session_id],
    queryFn: () =>
      fetchSessions(site, {
        sessionId: event?.session_id || "",
        limit: 1,
        page: 1,
        startDate: "2020-01-01",
        endDate: "2099-12-31",
        timeZone: getTimezone(),
      }).then(res => res.data[0] ?? null),
    enabled: open && !!event?.session_id && !!site,
    staleTime: 30000,
  });

  const timestamp = DateTime.fromSQL(event?.timestamp || "", { zone: "utc" })
    .setLocale(userLocale)
    .setZone(getTimezone())

  return (
    <Sheet
      open={open}
      onOpenChange={nextOpen => {
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-[1000px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>
            <div className="flex items-center gap-2">
              <EventTypeIcon type={event?.type || ""} className="w-5 h-5" />
              <span className="font-medium">{getEventTypeLabel(event?.type || "", t)}</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        {!event ? (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">{t("No event selected.")}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-1.5 sm:gap-6">
              <div className="space-y-3 flex-1">
                <div className="grid grid-cols-1 gap-1 text-sm">
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Timestamp")}</span>
                    <span>
                      {timestamp.toFormat(hour12 ? "MMM d, h:mm:ss a" : "dd MMM, HH:mm:ss")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("User")}</span>
                    <Link
                      href={`/${site}/user/${encodeURIComponent(event.identified_user_id || event.user_id)}`}
                      className="hover:underline"
                    >
                      {getUserDisplayName({
                        identified_user_id: event.identified_user_id || undefined,
                        user_id: event.user_id,
                      })}
                    </Link>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("User ID")}</span>
                    {truncateString(event.user_id, 24)}
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Session ID")}</span>
                    {truncateString(event.session_id, 24)}
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Hostname")}</span>
                    <span className="truncate max-w-[280px]">{event.hostname || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Path")}</span>
                    <span className="truncate max-w-[280px]">{buildEventPath(event) || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Referrer")}</span>
                    <span className="truncate max-w-[280px]">{event.referrer || "-"}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                <div className="grid grid-cols-1 gap-1 text-sm">
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Browser")}</span>
                    <span className="flex items-center gap-1">
                      <Browser browser={event.browser || "Unknown"} />
                      {event.browser || t("Unknown")}{event.browser_version ? ` ${event.browser_version}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Operating System")}</span>
                    <span className="flex items-center gap-1">
                      <OperatingSystem os={event.operating_system || ""} />
                      {event.operating_system || t("Unknown")}{event.operating_system_version ? ` ${event.operating_system_version}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Device")}</span>
                    <span className="flex items-center gap-1">
                      <DeviceIcon deviceType={event.device_type || ""} />
                      {event.device_type || t("Unknown")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Screen")}</span>
                    <span>{event.screen_width && event.screen_height ? `${event.screen_width} × ${event.screen_height}` : "-"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Language")}</span>
                    <span>{event.language || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                    <span className="text-neutral-500 dark:text-neutral-400">{t("Location")}</span>
                    <span className="flex items-center gap-1">{event.country && <CountryFlag country={event.country} />}{[event.city, getRegionName(event.region), getCountryName(event.country)].filter(Boolean).join(", ") || "-"}</span>
                  </div>
                  {(isFinite(event.lat) && isFinite(event.lon)) && (
                    <div className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-850 pb-1.5">
                      <span className="text-neutral-500 dark:text-neutral-400">{t("Coordinates")}</span>
                      <span>{event.lat.toFixed(4)}, {event.lon.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {Object.keys(selectedEventProperties).length > 0 &&
              <div>
                <div className="text-sm font-medium mb-2">{t("Properties")}</div>
                <pre className="text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-3 overflow-auto max-h-64">
                  {JSON.stringify(selectedEventProperties, null, 2)}
                </pre>
              </div>
            }

            <div>
              <div className="text-sm font-medium mb-2">{t("Session")}</div>
              {sessionQuery.isLoading ? (
                <SessionCardSkeleton count={1} />
              ) : sessionQuery.data ? (
                <SessionCard session={sessionQuery.data} expandedByDefault highlightedEventTimestamp={timestamp.toMillis()} />
              ) : (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{t("No session data")}</div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
