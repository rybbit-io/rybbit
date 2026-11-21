"use client";

import { IdCard } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useRef } from "react";
import { useArrivalHighlight } from "@/components/interior/use-arrival-highlight";
import { Event } from "../../../../../api/analytics/endpoints";
import { Avatar } from "../../../../../components/Avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { getTimezone } from "../../../../../lib/store";
import { cn, getCountryName, getUserDisplayName } from "../../../../../lib/utils";
import { Browser } from "../../../components/shared/icons/Browser";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { DeviceIcon } from "../../../components/shared/icons/Device";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { EventTypeMark } from "../EventTypeMark";
import { buildEventPath, getEventRowData, parseEventProperties, PropertyToken } from "./eventLogUtils";

/**
 * The log's columns, shared by the header and every row so they line up. They
 * follow the width of the log itself (its `@container`), not the window: a
 * narrow log keeps time, event and user; properties and device join at 760px,
 * the page at 980px. Everything is still in the details sheet a row opens.
 */
export const EVENT_LOG_GRID =
  "grid items-center gap-x-2 px-3 md:gap-x-3 md:px-4 grid-cols-[92px_minmax(0,1fr)_minmax(0,112px)] @min-[760px]:grid-cols-[104px_minmax(0,172px)_minmax(0,1fr)_150px_84px] @min-[980px]:grid-cols-[104px_minmax(0,172px)_minmax(0,1fr)_150px_minmax(0,164px)_84px]";
/** Shown from the width the properties and device columns appear at. */
export const EVENT_LOG_WIDE = "hidden @min-[760px]:flex";
/** Shown from the width the page column appears at. */
export const EVENT_LOG_WIDEST = "hidden @min-[980px]:block";

export const EVENT_LOG_ROW_HEIGHT = 32;

function Token({ token }: { token: PropertyToken }) {
  return (
    <span
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded border border-neutral-200 bg-neutral-50 px-1.5 py-px font-mono text-[11px] leading-4 dark:border-neutral-800 dark:bg-neutral-850"
      title={`${token.key}=${token.value}`}
    >
      <span className="text-neutral-500 dark:text-neutral-400">{token.key}</span>
      <span className="px-px text-neutral-400 dark:text-neutral-500">=</span>
      <span className="max-w-[28ch] truncate text-neutral-900 dark:text-neutral-100">{token.value}</span>
    </span>
  );
}

interface EventRowProps {
  event: Event;
  site: string;
  /** Set on a private-link view, so the user link stays inside it. */
  privateKey: string | null;
  /** The event's type as a word, for rows that have no name of their own. */
  typeLabel: string;
  onClick: (event: Event) => void;
  /** performance.now() when the row arrived from a poll; it gets a brief neutral highlight. */
  arrivedAt?: number;
}

export function EventRow({ event, site, privateKey, typeLabel, onClick, arrivedAt }: EventRowProps) {
  const t = useExtracted();
  const rowRef = useRef<HTMLDivElement>(null);
  useArrivalHighlight(rowRef, arrivedAt);
  const { locale, hour12, formatRelative } = useDateTimeFormat();
  const eventProperties = parseEventProperties(event);
  const eventTime = DateTime.fromSQL(event.timestamp, { zone: "utc" }).setLocale(locale).setZone(getTimezone());
  const isToday = eventTime.hasSame(DateTime.now().setZone(getTimezone()), "day");
  const pagePath = buildEventPath(event);
  const pageUrl = `https://${event.hostname}${pagePath}`;
  const data = getEventRowData(event, eventProperties);
  const userProfileId = event.identified_user_id || event.user_id;
  const userHref = `/${site}/${privateKey ? `${privateKey}/` : ""}user/${encodeURIComponent(userProfileId)}`;
  const displayName = getUserDisplayName({
    identified_user_id: event.identified_user_id || undefined,
    user_id: event.user_id,
    traits: event.traits,
  });

  return (
    <div
      ref={rowRef}
      className={cn(
        EVENT_LOG_GRID,
        "h-8 cursor-pointer border-b border-neutral-100 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40 [--arrival-bg:hsl(var(--neutral-100))] dark:[--arrival-bg:hsl(var(--neutral-800))]"
      )}
      onClick={() => onClick(event)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate tabular-nums text-neutral-500 dark:text-neutral-400">
            {/* Today's rows drop the date: in the live log it would repeat on every line. */}
            {isToday
              ? eventTime.toFormat(hour12 ? "h:mm:ss a" : "HH:mm:ss")
              : eventTime.toFormat(hour12 ? "MMM d, h:mm a" : "dd MMM, HH:mm")}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span>
            {eventTime.toFormat(hour12 ? "MMM d, h:mm:ss a" : "dd MMM, HH:mm:ss")} · {formatRelative(eventTime)}
          </span>
        </TooltipContent>
      </Tooltip>

      <div className="flex min-w-0 items-center gap-2">
        <EventTypeMark type={event.type} className="h-3.5 w-3.5" />
        {event.type === "custom_event" && event.event_name ? (
          <span className="truncate font-medium text-neutral-900 dark:text-neutral-100" title={event.event_name}>
            {event.event_name}
          </span>
        ) : (
          <span className="truncate text-neutral-600 dark:text-neutral-300">{typeLabel}</span>
        )}
      </div>

      <div
        className={cn(
          EVENT_LOG_WIDE,
          "min-w-0 items-center gap-1.5 overflow-hidden",
          // Tokens keep their width and fade out where they run past the column; the sheet has them all.
          data.kind === "tokens" && "[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]"
        )}
      >
        {data.kind === "link" ? (
          <Link
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="truncate text-neutral-600 hover:underline dark:text-neutral-300"
            title={data.url}
          >
            {data.url.replace(/^https?:\/\//, "")}
          </Link>
        ) : data.kind === "message" ? (
          <span className="truncate font-mono text-[11px] text-neutral-600 dark:text-neutral-300" title={data.text}>
            {data.text}
          </span>
        ) : (
          data.tokens.map(token => <Token key={token.key} token={token} />)
        )}
      </div>

      <Link
        href={userHref}
        onClick={e => e.stopPropagation()}
        className="flex min-w-0 items-center gap-2 hover:underline"
      >
        <Avatar size={18} id={event.user_id} lastActiveTime={eventTime} />
        <span className="truncate text-neutral-700 dark:text-neutral-200">{displayName}</span>
        {event.identified_user_id && (
          <IdCard
            className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-label={t("Identified user")}
          />
        )}
      </Link>

      <Link
        href={pageUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className={cn(EVENT_LOG_WIDEST, "truncate text-neutral-600 hover:underline dark:text-neutral-300")}
        title={pagePath}
      >
        {pagePath}
      </Link>

      <div className={cn(EVENT_LOG_WIDE, "items-center gap-1")}>
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
    </div>
  );
}
