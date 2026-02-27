"use client";

import { useExtracted } from "next-intl";
import Link from "next/link";
import { DateTime } from "luxon";
import { Event } from "../../../../../api/analytics/endpoints";
import { Avatar } from "../../../../../components/Avatar";
import { EventTypeIcon } from "../../../../../components/EventIcons";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { getTimezone } from "../../../../../lib/store";
import { getCountryName, getUserDisplayName, truncateString } from "../../../../../lib/utils";
import { Browser } from "../../../components/shared/icons/Browser";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { buildEventPath, getEventTypeLabel, getMainData, parseEventProperties } from "./eventLogUtils";
import { DeviceIcon } from "../../../components/shared/icons/Device";

interface EventRowProps {
  event: Event;
  site: string;
  onClick: (event: Event) => void;
}

export function EventRow({ event, site, onClick }: EventRowProps) {
  const t = useExtracted();
  const { locale, hour12, formatRelative } = useDateTimeFormat();
  const eventProperties = parseEventProperties(event);
  const eventTime = DateTime.fromSQL(event.timestamp, { zone: "utc" })
    .setLocale(locale)
    .setZone(getTimezone());
  const pagePath = buildEventPath(event);
  const pageUrl = `https://${event.hostname}${pagePath}`;
  const isPageview = event.type === "pageview";
  const eventData = isPageview ? null : getMainData(event, eventProperties, t);
  const userProfileId = event.identified_user_id || event.user_id;
  const displayName = getUserDisplayName({
    identified_user_id: event.identified_user_id || undefined,
    user_id: event.user_id,
  });

  return (
    <div
      className="grid grid-cols-[28px_145px_180px_100px_1fr_1fr] border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 cursor-pointer"
      onClick={() => onClick(event)}
    >
      <div className="flex items-center justify-center py-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <EventTypeIcon type={event.type} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <span>{getEventTypeLabel(event.type, t)}</span>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="text-neutral-500 dark:text-neutral-400 px-2 py-1 flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{eventTime.toFormat(hour12 ? "MMM d, h:mm:ss a" : "dd MMM, HH:mm:ss")}</span>
          </TooltipTrigger>
          <TooltipContent>
            <span>{formatRelative(eventTime)}</span>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="px-2 py-1">
        <Link
          href={`/${site}/user/${encodeURIComponent(userProfileId)}`}
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-2"
        >
          <Avatar size={18} id={event.user_id} lastActiveTime={eventTime} />
          <div className="text-neutral-700 dark:text-neutral-200 truncate max-w-[160px] hover:underline">{displayName}</div>
        </Link>
      </div>

      <div className="flex space-x-1 items-center px-2 py-1">
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
            <p>{event.browser || t("Unknown browser")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <OperatingSystem os={event.operating_system || ""} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{event.operating_system || t("Unknown OS")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DeviceIcon deviceType={event.device_type || ""} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{event.device_type || t("Unknown device")}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="text-neutral-600 dark:text-neutral-300 px-2 py-1 truncate">
        <Link
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="hover:underline"
          title={pagePath}
        >
          {truncateString(pagePath, 60)}
        </Link>
      </div>

      <div className="text-neutral-600 dark:text-neutral-300 px-2 py-1 truncate">
        {eventData && (
          eventData.url ? (
            <Link
              href={eventData.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="hover:underline"
              title={eventData.label}
            >
              {truncateString(eventData.label, 60)}
            </Link>
          ) : (
            <span title={eventData.label}>
              {truncateString(eventData.label, 60)}
            </span>
          )
        )}
      </div>
    </div>
  );
}
