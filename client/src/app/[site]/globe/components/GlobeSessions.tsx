"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useMemo } from "react";
import { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import { useGetSessionsInfinite } from "../../../../api/analytics/hooks/useGetUserSessions";
import { Avatar, generateName } from "../../../../components/Avatar";
import { EventTypeIcon } from "../../../../components/EventIcons";
import {
  BrowserTooltipIcon,
  CountryFlagTooltipIcon,
  DeviceTypeTooltipIcon,
  OperatingSystemTooltipIcon,
} from "../../../../components/TooltipIcons/TooltipIcons";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useDateTimeFormat } from "../../../../hooks/useDateTimeFormat";
import { formatShortDuration } from "../../../../lib/dateTimeUtils";
import { useTimezone } from "../../../../lib/store";
import { formatter } from "../../../../lib/utils";

// A replay window can hold thousands of sessions; the list shows the first of them.
const WINDOW_LIST_LIMIT = 100;

function SessionRowSkeleton() {
  return (
    <div className="space-y-2 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-sm" />
        <Skeleton className="h-4 w-4 rounded-sm" />
        <Skeleton className="h-4 w-4 rounded-sm" />
        <Skeleton className="h-4 w-12 rounded-sm" />
      </div>
    </div>
  );
}

function SessionRow({ session, onSelect }: { session: GetSessionsResponse[number]; onSelect: () => void }) {
  const t = useExtracted();
  const timeZone = useTimezone();
  const { hour12, formatDateTime } = useDateTimeFormat();
  const start = DateTime.fromSQL(session.session_start, { zone: "utc" });
  const end = DateTime.fromSQL(session.session_end, { zone: "utc" });
  const duration = formatShortDuration(Math.floor(end.diff(start).milliseconds / 1000));
  const name = generateName(session.user_id);

  return (
    <div
      role="button"
      tabIndex={0}
      className="cursor-pointer space-y-2 px-3 py-2.5 outline-none hover:bg-neutral-50 focus-visible:bg-neutral-50 dark:hover:bg-neutral-800/30 dark:focus-visible:bg-neutral-800/30"
      aria-label={t("Open the session of {name}", { name })}
      onClick={onSelect}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Avatar id={session.user_id} size={16} />
          <span className="truncate text-xs text-neutral-800 dark:text-neutral-200">{name}</span>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
          {formatDateTime(start, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12,
            timeZone,
          })}
          {" · "}
          {duration}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
        {session.country && (
          <CountryFlagTooltipIcon country={session.country} city={session.city} region={session.region} />
        )}
        <BrowserTooltipIcon browser={session.browser || "Unknown"} browser_version={session.browser_version} />
        <OperatingSystemTooltipIcon
          operating_system={session.operating_system || ""}
          operating_system_version={session.operating_system_version}
        />
        <DeviceTypeTooltipIcon
          device_type={session.device_type || ""}
          screen_width={session.screen_width}
          screen_height={session.screen_height}
        />
        <span className="inline-flex items-center gap-1 tabular-nums" title={t("Pageviews")}>
          <EventTypeIcon type="pageview" />
          {formatter(session.pageviews)}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums" title={t("Events")}>
          <EventTypeIcon type="custom_event" />
          {formatter(session.events)}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-neutral-500 dark:text-neutral-400">
          {session.entry_page}
        </span>
      </div>
    </div>
  );
}

interface GlobeSessionsProps {
  /** Sessions in the replay window on the map; null lists the whole period. */
  windowSessions: GetSessionsResponse | null;
  windowLoading: boolean;
  onSelect: (session: GetSessionsResponse[number]) => void;
}

/**
 * The people behind the map, in the rail: the period's sessions, or the ones
 * in the replay window while one is on the map. A row opens the session in the
 * panel over the map.
 */
export function GlobeSessions({ windowSessions, windowLoading, onSelect }: GlobeSessionsProps) {
  const t = useExtracted();
  const period = useGetSessionsInfinite({});
  const periodSessions = useMemo(() => period.data?.pages.flatMap(page => page ?? []) ?? [], [period.data]);

  const inWindow = windowSessions !== null;
  const sessions = inWindow ? windowSessions.slice(0, WINDOW_LIST_LIMIT) : periodSessions;
  const isLoading = inWindow ? windowLoading : period.isLoading;
  const hidden = inWindow ? windowSessions.length - sessions.length : 0;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
        {isLoading
          ? Array.from({ length: 8 }, (_, index) => <SessionRowSkeleton key={index} />)
          : sessions.map(session => (
              <SessionRow key={session.session_id} session={session} onSelect={() => onSelect(session)} />
            ))}
        {!inWindow && period.isFetchingNextPage && <SessionRowSkeleton />}
      </div>

      {!isLoading && sessions.length === 0 && (
        <p className="px-3 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {inWindow ? t("No sessions in this window") : t("No sessions in this period")}
        </p>
      )}
      {hidden > 0 && (
        <p className="border-t border-neutral-100 px-3 py-2.5 text-xs tabular-nums text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {t("{count} more in this window", { count: hidden.toLocaleString() })}
        </p>
      )}
      {!inWindow && period.hasNextPage && !isLoading && (
        <div className="border-t border-neutral-100 p-2 dark:border-neutral-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => period.fetchNextPage()}
            loading={period.isFetchingNextPage}
          >
            {t("Load more")}
          </Button>
        </div>
      )}
    </div>
  );
}
