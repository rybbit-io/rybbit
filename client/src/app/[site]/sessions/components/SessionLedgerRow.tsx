"use client";

import { FilterParameter } from "@rybbit/shared";
import { ArrowRight, ChevronDown, ChevronRight, TriangleAlert, Video } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { MouseEvent, useState } from "react";
import { GetSessionsResponse } from "@/api/analytics/endpoints";
import { Avatar } from "@/components/Avatar";
import { ChannelIcon, extractDomain, getDisplayName } from "@/components/Channel";
import { IdentifiedBadge } from "@/components/IdentifiedBadge";
import { ReplayDrawer } from "@/components/Sessions/ReplayDrawer";
import { sessionEventCount } from "@/components/Sessions/sessionEventCount";
import {
  BrowserTooltipIcon,
  CountryFlagTooltipIcon,
  DeviceTypeTooltipIcon,
  OperatingSystemTooltipIcon,
} from "@/components/TooltipIcons/TooltipIcons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { addFilter, useTimezone } from "@/lib/store";
import { cn, getUserDisplayName } from "@/lib/utils";
import { GoalChip, useGoalName } from "./GoalChip";
import { SessionLedgerDetails } from "./SessionLedgerDetails";
import { useSitePath } from "./useSitePath";

type Session = GetSessionsResponse[number];

/*
 * The ledger lays itself out by its own width, not the viewport's: the sidebar
 * takes a fixed share of the window and can be hidden, so a viewport
 * breakpoint would be wrong one way or the other. The ledger card is the
 * container (see SessionsLedger).
 *
 *   under 800px   each session is a short stack of lines
 *   800px         chevron, user, device, entry and exit, pages, events, duration, replay, started
 *   1080px        plus errors, source and, on a site with goals, goal
 *
 * The last column holds a time under a day heading and a date and time
 * otherwise, so it comes in two widths. Every class is written out in full
 * for Tailwind to find.
 */
const COMPACT_COLUMNS = {
  time: "@min-[800px]:grid-cols-[16px_140px_84px_minmax(0,1fr)_48px_52px_72px_24px_72px]",
  dateTime: "@min-[800px]:grid-cols-[16px_140px_84px_minmax(0,1fr)_48px_52px_72px_24px_116px]",
};
const WIDE_COLUMNS = {
  time: "@min-[1080px]:grid-cols-[16px_150px_84px_minmax(0,1fr)_44px_52px_48px_68px_108px_24px_72px]",
  dateTime: "@min-[1080px]:grid-cols-[16px_150px_84px_minmax(0,1fr)_44px_52px_48px_68px_108px_24px_116px]",
};
const WIDE_COLUMNS_WITH_GOAL = {
  time: "@min-[1080px]:grid-cols-[16px_150px_84px_minmax(0,1fr)_44px_52px_48px_68px_108px_118px_24px_72px]",
  dateTime: "@min-[1080px]:grid-cols-[16px_150px_84px_minmax(0,1fr)_44px_52px_48px_68px_108px_118px_24px_116px]",
};

/** Shown only once the ledger is wide enough for every column. */
export const WIDE_ONLY_BLOCK = "hidden @min-[1080px]:block";
export const WIDE_ONLY_FLEX = "hidden @min-[1080px]:flex";

/** The grid every ledger row and the column header share. Hidden below 800px. */
export const ledgerGrid = (showGoals: boolean, groupedByDay: boolean) => {
  const started = groupedByDay ? "time" : "dateTime";
  return cn(
    "hidden items-center gap-x-3 px-3 @min-[800px]:grid",
    COMPACT_COLUMNS[started],
    (showGoals ? WIDE_COLUMNS_WITH_GOAL : WIDE_COLUMNS)[started]
  );
};

/** What takes the grid's place below 800px. */
export const STACKED_ONLY = "@min-[800px]:hidden";

interface SessionLedgerRowProps {
  session: Session;
  /** The site has goals, so the ledger has a Goal column. */
  showGoals: boolean;
  /** The site has a Replay page, so sessions with a replay offer it. */
  showReplay: boolean;
  /** Rows sit under a day heading, so the start time needs no date. */
  groupedByDay: boolean;
}

/**
 * One session as one aligned line: who, on what, from where to where, how
 * much, how long, from which source, which goal, and when. The marks keep
 * their click-to-filter; the row itself opens the timeline and facts.
 */
export function SessionLedgerRow({ session, showGoals, showReplay, groupedByDay }: SessionLedgerRowProps) {
  const t = useExtracted();
  const goalName = useGoalName();
  const sitePath = useSitePath();
  const zone = useTimezone();
  const { hour12, formatDateTime, formatRelative } = useDateTimeFormat();
  const [expanded, setExpanded] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);

  const isIdentified = !!session.identified_user_id;
  const userHref = sitePath(`user/${encodeURIComponent(isIdentified ? session.identified_user_id : session.user_id)}`);
  const hasReplay = showReplay && session.has_replay === 1;
  const goals = session.converted_goals ?? [];
  const eventCount = sessionEventCount(session);
  const singlePage = session.pageviews === 1 && session.entry_page === session.exit_page;
  const referrerDomain = extractDomain(session.referrer);
  const source = referrerDomain ? getDisplayName(referrerDomain) : session.channel;

  const start = DateTime.fromSQL(session.session_start, { zone: "utc" });
  const startedTime = formatDateTime(start, { hour: "numeric", minute: "2-digit", hour12, timeZone: zone });
  const startedDate = formatDateTime(start, { month: "short", day: "numeric", timeZone: zone });
  const startedFull = `${formatDateTime(start, { dateStyle: "medium", timeStyle: "medium", hour12, timeZone: zone })} (${formatRelative(start)})`;

  const stop = (event: MouseEvent) => event.stopPropagation();
  const filterBy = (parameter: FilterParameter, value: string | undefined) => (event: MouseEvent) => {
    event.stopPropagation();
    if (!value) return;
    addFilter({ parameter, value: [value], type: "equals" });
  };

  // An event breakdown is only worth a tooltip when the total hides something.
  const eventParts = [
    [t("Custom events"), session.events],
    [t("Button clicks"), session.button_clicks],
    [t("Copies"), session.copies],
    [t("Form submits"), session.form_submits],
    [t("Input changes"), session.input_changes],
  ].filter((part): part is [string, number] => Number(part[1]) > 0);
  const showEventBreakdown = eventParts.length > 1 || eventCount !== session.events || session.outbound > 0;

  const toggle = (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={expanded ? t("Collapse session") : t("Expand session")}
      // The row toggles on click too; without this the two would cancel out.
      onClick={event => {
        event.stopPropagation();
        setExpanded(!expanded);
      }}
      className="flex shrink-0 items-center rounded text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:text-neutral-400"
    >
      {expanded ? (
        <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      )}
    </button>
  );

  const user = (
    <Link href={userHref} onClick={stop} className="flex min-w-0 items-center gap-2">
      <Avatar size={20} id={session.user_id} lastActiveTime={DateTime.fromSQL(session.session_end, { zone: "utc" })} />
      <span
        className={cn(
          "truncate hover:underline",
          isIdentified ? "font-medium text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300"
        )}
      >
        {getUserDisplayName(session)}
      </span>
      {isIdentified && (
        <IdentifiedBadge traits={session.traits} userId={session.identified_user_id} className="shrink-0 px-1 py-px" />
      )}
    </Link>
  );

  const marks = (
    <div className="flex shrink-0 items-center gap-1.5">
      {session.country && (
        <CountryFlagTooltipIcon
          country={session.country}
          city={session.city}
          region={session.region}
          onClick={filterBy("country", session.country)}
        />
      )}
      <BrowserTooltipIcon
        browser={session.browser || "Unknown"}
        browser_version={session.browser_version}
        onClick={filterBy("browser", session.browser)}
      />
      <OperatingSystemTooltipIcon
        operating_system={session.operating_system || ""}
        operating_system_version={session.operating_system_version}
        onClick={filterBy("operating_system", session.operating_system)}
      />
      <span className="text-neutral-500 dark:text-neutral-400">
        <DeviceTypeTooltipIcon
          device_type={session.device_type || ""}
          screen_width={session.screen_width}
          screen_height={session.screen_height}
          size={16}
          onClick={filterBy("device_type", session.device_type)}
        />
      </span>
    </div>
  );

  const pathButton = (parameter: "entry_page" | "exit_page", path: string, className: string) => (
    <button
      type="button"
      title={t("{path} (click to filter)", { path: path || "-" })}
      onClick={filterBy(parameter, path)}
      className={cn("truncate text-left underline-offset-2 hover:underline", className)}
    >
      {path || "-"}
    </button>
  );
  const paths = (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
      {pathButton("entry_page", session.entry_page, "min-w-0 shrink")}
      {singlePage ? (
        <span className="shrink-0 text-neutral-500 dark:text-neutral-400">{t("single page")}</span>
      ) : (
        <>
          <ArrowRight className="h-3 w-3 shrink-0 text-neutral-500" />
          {pathButton("exit_page", session.exit_page, "max-w-[55%] shrink-0")}
        </>
      )}
    </div>
  );

  const events = showEventBreakdown ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{eventCount.toLocaleString()}</span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5 text-xs tabular-nums">
          {eventParts.map(([label, count]) => (
            <div key={label} className="flex justify-between gap-4">
              <span>{label}</span>
              <span>{count.toLocaleString()}</span>
            </div>
          ))}
          {session.outbound > 0 && (
            <div className="flex justify-between gap-4 opacity-70">
              <span>{t("Outbound clicks (not counted)")}</span>
              <span>{session.outbound.toLocaleString()}</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  ) : (
    eventCount.toLocaleString()
  );

  const errors = session.errors > 0 && (
    <span
      className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400"
      title={t("JavaScript errors: {count}", { count: session.errors.toLocaleString() })}
    >
      <TriangleAlert className="h-3 w-3" aria-hidden="true" />
      {session.errors.toLocaleString()}
    </span>
  );

  const sourceButton = (
    <button
      type="button"
      title={t("{channel} (click to filter)", { channel: session.channel || t("Unknown") })}
      onClick={filterBy("channel", session.channel)}
      className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-700 hover:underline dark:text-neutral-300"
    >
      <ChannelIcon channel={session.channel} className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
      <span className="truncate">{source || t("Unknown")}</span>
    </button>
  );

  const goal = goals.length > 0 && (
    <div className="flex min-w-0 items-center gap-1">
      <GoalChip goal={goals[0]} className="min-w-0" />
      {goals.length > 1 && (
        <span
          className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400"
          title={goals.slice(1).map(goalName).join(", ")}
        >
          +{goals.length - 1}
        </span>
      )}
    </div>
  );

  const replay = hasReplay && (
    <Button
      type="button"
      variant="ghost"
      size="smIcon"
      aria-label={t("Watch replay")}
      title={t("Watch replay")}
      onClick={event => {
        event.stopPropagation();
        setReplayOpen(true);
      }}
      className="h-6 w-6 text-neutral-700 dark:text-neutral-200"
    >
      <Video />
    </Button>
  );

  return (
    <>
      <div
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "cursor-pointer border-b border-neutral-100 text-[13px] dark:border-neutral-800",
          expanded ? "bg-neutral-50 dark:bg-neutral-850" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/20"
        )}
      >
        {/* A narrow ledger: the same facts stacked on three short lines. */}
        <div className={cn("flex flex-col gap-1.5 px-3 py-2", STACKED_ONLY)}>
          <div className="flex items-center gap-2">
            {toggle}
            {user}
            <span
              className="ml-auto shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400"
              title={startedFull}
            >
              {groupedByDay ? startedTime : `${startedDate}, ${startedTime}`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-6 text-xs tabular-nums">
            {marks}
            <span className="text-neutral-500 dark:text-neutral-400">
              {t("Pages")}{" "}
              <span className="text-neutral-800 dark:text-neutral-200">{session.pageviews.toLocaleString()}</span>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              {t("Events")}{" "}
              <span className={eventCount ? "text-neutral-800 dark:text-neutral-200" : undefined}>
                {eventCount.toLocaleString()}
              </span>
            </span>
            <span className="text-neutral-800 dark:text-neutral-200">
              {formatShortDuration(session.session_duration)}
            </span>
            {errors}
            {replay && <span className="-my-1">{replay}</span>}
          </div>
          <div className="flex min-w-0 items-center gap-3 pl-6">
            <div className="min-w-0 flex-1">{paths}</div>
            <div className="max-w-[40%] shrink-0">{sourceButton}</div>
          </div>
          {goal && <div className="pl-6">{goal}</div>}
        </div>

        {/* With room: one aligned line. */}
        <div className={cn("h-9", ledgerGrid(showGoals, groupedByDay))}>
          {toggle}
          {user}
          {marks}
          {paths}
          <div className="text-right tabular-nums">{session.pageviews.toLocaleString()}</div>
          <div className={cn("text-right tabular-nums", !eventCount && "text-neutral-500")}>{events}</div>
          <div className={cn("text-right tabular-nums", WIDE_ONLY_BLOCK)}>{errors}</div>
          <div className="text-right tabular-nums">{formatShortDuration(session.session_duration)}</div>
          <div className={cn("min-w-0 pl-2", WIDE_ONLY_FLEX)}>{sourceButton}</div>
          {showGoals && <div className={cn("min-w-0", WIDE_ONLY_BLOCK)}>{goal}</div>}
          <div className="flex justify-center">{replay}</div>
          <div
            className="truncate text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400"
            title={startedFull}
          >
            {groupedByDay ? startedTime : `${startedDate}, ${startedTime}`}
          </div>
        </div>
      </div>

      {expanded && (
        <SessionLedgerDetails
          session={session}
          userHref={userHref}
          onWatchReplay={hasReplay ? () => setReplayOpen(true) : undefined}
        />
      )}

      {hasReplay && <ReplayDrawer sessionId={session.session_id} open={replayOpen} onOpenChange={setReplayOpen} />}
    </>
  );
}
