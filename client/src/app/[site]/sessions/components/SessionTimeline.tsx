"use client";

import {
  Copy,
  ExternalLink,
  Eye,
  FileInput,
  LucideIcon,
  MousePointerClick,
  SquareMousePointer,
  TextCursorInput,
  TriangleAlert,
} from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { SessionEvent } from "@/api/analytics/endpoints";
import { useGetSessionDetailsInfinite } from "@/api/analytics/hooks/useGetUserSessions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { EVENT_TYPE_CONFIG, EventType, PROPS_TO_HIDE, useEventDisplayName } from "@/lib/events";
import { useTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GoalChip } from "./GoalChip";

// Colour is kept for state: pageviews and autocaptured interactions are
// neutral, tracked events take the data colour, errors are red.
const NEUTRAL = "text-neutral-500 dark:text-neutral-400";
const TYPE_MARKS: Record<EventType, { icon: LucideIcon; className: string }> = {
  pageview: { icon: Eye, className: NEUTRAL },
  custom_event: { icon: MousePointerClick, className: "text-dataviz" },
  outbound: { icon: ExternalLink, className: NEUTRAL },
  button_click: { icon: SquareMousePointer, className: NEUTRAL },
  copy: { icon: Copy, className: NEUTRAL },
  form_submit: { icon: FileInput, className: NEUTRAL },
  input_change: { icon: TextCursorInput, className: NEUTRAL },
  error: { icon: TriangleAlert, className: "text-red-500 dark:text-red-400" },
};

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const mark = TYPE_MARKS[type as EventType] ?? TYPE_MARKS.custom_event;
  const Icon = mark.icon;
  return <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", mark.className, className)} />;
}

const toMillis = (timestamp: string) => DateTime.fromSQL(timestamp, { zone: "utc" }).toMillis();

/**
 * Seconds spent on each pageview, by its index in `events`: the time until the
 * next pageview, or until the session's last event for the final one. The
 * final page is only timed once every event is loaded.
 */
function timeOnPages(events: SessionEvent[], sessionEnd: string | undefined, complete: boolean) {
  const seconds = new Map<number, number>();
  let previous: number | null = null;

  events.forEach((event, index) => {
    if (event.type !== "pageview") return;
    if (previous !== null) {
      seconds.set(previous, Math.max(0, (toMillis(event.timestamp) - toMillis(events[previous].timestamp)) / 1000));
    }
    previous = index;
  });

  if (previous !== null && complete && sessionEnd) {
    // A pageview that is also the session's last event has no measurable time.
    const last = (toMillis(sessionEnd) - toMillis(events[previous].timestamp)) / 1000;
    if (last >= 1) seconds.set(previous, last);
  }
  return seconds;
}

function PropBadge({ label, value }: { label: string; value: unknown }) {
  const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
  return (
    <span
      title={`${label}: ${text}`}
      className="inline-flex max-w-56 items-center rounded-md border border-neutral-150 px-1.5 py-0.5 text-xs dark:border-neutral-800"
    >
      <span className="mr-1 shrink-0 text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">{text}</span>
    </span>
  );
}

/** The props worth a badge: not the ones the event's own label already spells out. */
function badgeProps(event: SessionEvent): [string, unknown][] {
  if (!event.props || event.type === "pageview") return [];
  if (event.type === "error") return [];
  if (event.type === "outbound") {
    return (["text", "target"] as const).flatMap(key => (event.props?.[key] ? [[key, event.props[key]]] : []));
  }
  const hidden = PROPS_TO_HIDE[event.type] ?? [];
  return Object.entries(event.props).filter(([key]) => !hidden.includes(key));
}

interface TimelineRowProps {
  event: SessionEvent;
  /** Seconds on this page; undefined for anything but a timed pageview. */
  timeOnPage: number | undefined;
  longestPage: number;
  showHostname: boolean;
}

function TimelineRow({ event, timeOnPage, longestPage, showHostname }: TimelineRowProps) {
  const t = useExtracted();
  const eventDisplayName = useEventDisplayName();
  const { hour12 } = useDateTimeFormat();
  const zone = useTimezone();
  const [stackOpen, setStackOpen] = useState(false);

  const isPageview = event.type === "pageview";
  const isError = event.type === "error";
  const time = DateTime.fromSQL(event.timestamp, { zone: "utc" }).setZone(zone);
  const outboundUrl = event.type === "outbound" && event.props?.url ? String(event.props.url) : null;
  const message = isError && event.props?.message ? String(event.props.message) : null;
  const stack = isError && event.props?.stack ? String(event.props.stack) : null;
  const props = badgeProps(event);

  return (
    <li className="border-b border-neutral-100 py-1 last:border-0 dark:border-neutral-800/70">
      <div className="flex min-h-6 items-center gap-3">
        <span className="w-[4.5rem] shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
          {time.toFormat(hour12 ? "h:mm:ss a" : "HH:mm:ss")}
        </span>
        {/* Everything that happened on a page sits indented under it. */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1",
            !isPageview && "@min-[520px]:pl-6"
          )}
        >
          <TypeIcon type={event.type} />
          {isPageview ? (
            <a
              href={`https://${event.hostname}${event.pathname}${event.querystring ?? ""}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`${event.pathname}${event.querystring ?? ""}`}
              className="min-w-0 truncate text-sm text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
            >
              {showHostname && event.hostname}
              {event.pathname}
              {event.querystring && <span className="text-neutral-500 dark:text-neutral-400">{event.querystring}</span>}
            </a>
          ) : outboundUrl ? (
            <a
              href={outboundUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={outboundUrl}
              className="min-w-0 truncate text-sm font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100"
            >
              {outboundUrl}
            </a>
          ) : (
            <span className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {isError ? event.event_name || t("Error") : eventDisplayName(event)}
            </span>
          )}
          {isPageview && event.page_title && (
            <span className="hidden min-w-0 truncate text-xs text-neutral-500 @min-[520px]:inline dark:text-neutral-400">
              {event.page_title}
            </span>
          )}
          {message && (
            <span title={message} className="min-w-0 truncate text-xs text-neutral-600 dark:text-neutral-300">
              {message}
            </span>
          )}
          {stack && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-expanded={stackOpen}
              onClick={() => setStackOpen(!stackOpen)}
              className="font-normal text-neutral-600 dark:text-neutral-300"
            >
              {stackOpen ? t("Hide stack trace") : t("Stack trace")}
            </Button>
          )}
          {props.map(([key, value]) => (
            <PropBadge key={key} label={key} value={value} />
          ))}
        </div>
        {event.goals?.map(goal => (
          <GoalChip key={goal.id} goal={goal} className="hidden shrink-0 @min-[520px]:inline-flex" />
        ))}
        {timeOnPage !== undefined ? (
          <div
            className="flex w-16 shrink-0 items-center justify-end gap-2 @min-[520px]:w-28"
            title={t("Time on page: {duration}", { duration: formatShortDuration(timeOnPage) })}
          >
            <div className="hidden h-1 flex-1 overflow-hidden rounded-full bg-neutral-100 @min-[520px]:block dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-dataviz/70"
                style={{ width: `${longestPage > 0 ? Math.max(4, Math.round((timeOnPage / longestPage) * 100)) : 0}%` }}
              />
            </div>
            <span className="w-14 text-right text-xs tabular-nums text-neutral-700 dark:text-neutral-300">
              {formatShortDuration(timeOnPage)}
            </span>
          </div>
        ) : (
          <div className="hidden w-28 shrink-0 @min-[520px]:block" />
        )}
      </div>
      {/* A narrow timeline has no room for the chip beside the label. */}
      {!!event.goals?.length && (
        <div className="mt-1 flex flex-wrap gap-1 pl-[5.25rem] @min-[520px]:hidden">
          {event.goals.map(goal => (
            <GoalChip key={goal.id} goal={goal} />
          ))}
        </div>
      )}
      {stack && stackOpen && (
        <pre className="mb-1 mt-1.5 overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-neutral-100 p-2 text-xs text-neutral-900 @min-[520px]:ml-[5.25rem] dark:bg-neutral-800 dark:text-neutral-100">
          {stack}
        </pre>
      )}
    </li>
  );
}

function TimelineSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true">
      <div className="mb-2 flex gap-1.5">
        <Skeleton className="h-6 w-24 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex h-8 items-center gap-3 border-b border-neutral-100 last:border-0 dark:border-neutral-800/70"
        >
          <Skeleton className="h-3 w-14 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className={cn("h-3 rounded", index % 3 === 0 ? "w-40" : index % 3 === 1 ? "w-56" : "w-28")} />
        </div>
      ))}
    </div>
  );
}

interface SessionTimelineProps {
  sessionId: string;
  /** How many rows to sketch while loading; the session's own event count. */
  expectedEvents: number;
}

/**
 * Everything a session did, in order, one compact row per event: when, what,
 * the goals it completed, and for pageviews how long the page was open. The
 * type chips hide and show kinds of event; errors start visible.
 */
export function SessionTimeline({ sessionId, expectedEvents }: SessionTimelineProps) {
  const t = useExtracted();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetSessionDetailsInfinite(sessionId);
  const [hiddenTypes, setHiddenTypes] = useState<ReadonlySet<string>>(new Set());

  const events = useMemo(() => data?.pages.flatMap(page => page?.events ?? []) ?? [], [data?.pages]);
  const sessionEnd = data?.pages[0]?.session?.session_end;
  const total = data?.pages[0]?.pagination?.total ?? 0;

  const pageSeconds = useMemo(() => timeOnPages(events, sessionEnd, !hasNextPage), [events, sessionEnd, hasNextPage]);
  const longestPage = Math.max(0, ...pageSeconds.values());

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    return counts;
  }, [events]);

  const showHostname = useMemo(
    () => new Set(events.filter(event => event.type === "pageview").map(event => event.hostname)).size > 1,
    [events]
  );

  const typeLabels: Record<EventType, string> = {
    pageview: t("Pageviews"),
    custom_event: t("Events"),
    outbound: t("Outbound"),
    button_click: t("Button clicks"),
    copy: t("Copies"),
    form_submit: t("Form submits"),
    input_change: t("Input changes"),
    error: t("Errors"),
  };

  const toggleType = (type: string) =>
    setHiddenTypes(current => {
      const next = new Set(current);
      if (!next.delete(type)) next.add(type);
      return next;
    });

  if (isLoading) return <TimelineSkeleton rows={Math.min(Math.max(expectedEvents, 3), 12)} />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("Error loading session details. Please try again.")}</AlertDescription>
      </Alert>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">{t("No data available")}</div>
    );
  }

  const presentTypes = EVENT_TYPE_CONFIG.filter(config => typeCounts.has(config.value));
  const visible = events.map((event, index) => ({ event, index })).filter(({ event }) => !hiddenTypes.has(event.type));

  return (
    // Its rows size themselves against the timeline's own width: it is the
    // whole ledger wide on a phone and a column beside the facts on a desktop.
    <div className="@container">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        {presentTypes.map(config => {
          const on = !hiddenTypes.has(config.value);
          return (
            <button
              key={config.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggleType(config.value)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition-colors",
                on
                  ? "bg-neutral-150 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              )}
            >
              <TypeIcon type={config.value} className={cn("h-3 w-3", !on && "opacity-40")} />
              {typeLabels[config.value]}
              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                {typeCounts.get(config.value)}
              </span>
            </button>
          );
        })}
        <span className="ml-auto text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
          {t("{shown} of {total} events", {
            shown: String(visible.length),
            total: String(Math.max(total, events.length)),
          })}
          {/* Says what the bars on the pageview rows measure. */}
          {pageSeconds.size > 0 && ` · ${t("time on page")}`}
        </span>
      </div>

      <ol>
        {visible.map(({ event, index }) => (
          <TimelineRow
            key={`${event.timestamp}-${index}`}
            event={event}
            timeOnPage={pageSeconds.get(index)}
            longestPage={longestPage}
            showHostname={showHostname}
          />
        ))}
      </ol>

      {hasNextPage && (
        <div className="mt-2 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            loading={isFetchingNextPage}
            loadingLabel={t("Loading...")}
          >
            {t("Load More")}
          </Button>
        </div>
      )}
    </div>
  );
}
