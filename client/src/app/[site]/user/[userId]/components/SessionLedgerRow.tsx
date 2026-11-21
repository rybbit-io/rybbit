"use client";

import { FilterParameter } from "@rybbit/shared";
import { ArrowRight, ChevronDown, ChevronRight, Target, TriangleAlert, Video } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { MouseEvent, useState } from "react";
import { GetSessionsResponse } from "../../../../../api/analytics/endpoints";
import { Channel } from "../../../../../components/Channel";
import { EventTypeIcon } from "../../../../../components/EventIcons";
import { ReplayDrawer } from "../../../../../components/Sessions/ReplayDrawer";
import { SessionDetails } from "../../../../../components/Sessions/SessionDetails";
import {
  BrowserTooltipIcon,
  CountryFlagTooltipIcon,
  DeviceTypeTooltipIcon,
  OperatingSystemTooltipIcon,
} from "../../../../../components/TooltipIcons/TooltipIcons";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { formatShortDuration } from "../../../../../lib/dateTimeUtils";
import { addFilter, useTimezone } from "../../../../../lib/store";
import { cn, formatter, truncateString } from "../../../../../lib/utils";

type Session = GetSessionsResponse[number];

const QUIET_BADGE = "flex items-center gap-1 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";

interface SessionLedgerRowProps {
  session: Session;
  userId: string;
  /** Names of the goals this session completed. */
  goals: string[];
  /** Day groups print the time alone; week groups need the weekday too. */
  showWeekday: boolean;
}

/**
 * One session in the profile's day ledger. It carries what the shared session
 * card carries, minus the user (the whole page is one user), plus what the
 * card does not show without opening it: errors and completed goals. Opening
 * the row shows the same session details the card does.
 */
export function SessionLedgerRow({ session, userId, goals, showWeekday }: SessionLedgerRowProps) {
  const t = useExtracted();
  const zone = useTimezone();
  const { hour12, formatDateTime } = useDateTimeFormat();
  const [expanded, setExpanded] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);

  const start = DateTime.fromSQL(session.session_start, { zone: "utc" }).setZone(zone);
  const startLabel = formatDateTime(start, {
    weekday: showWeekday ? "short" : undefined,
    hour: "numeric",
    minute: "2-digit",
    hour12,
    timeZone: zone,
  });
  const startTitle = formatDateTime(start, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12,
    timeZone: zone,
  });

  const interactions =
    session.events +
    (session.button_clicks || 0) +
    (session.copies || 0) +
    (session.form_submits || 0) +
    (session.input_changes || 0);
  const hasReplay = session.has_replay === 1;

  // Clicking an attribute filters the profile by it, as on the session card.
  const filterBy = (event: MouseEvent, parameter: FilterParameter, value: string | undefined) => {
    event.stopPropagation();
    if (!value) return;
    addFilter({ parameter, value: [value], type: "equals" });
  };

  const when = (
    <span className="flex shrink-0 items-baseline gap-2.5 whitespace-nowrap" title={startTitle}>
      <span className="text-xs font-medium tabular-nums text-neutral-900 dark:text-neutral-100">{startLabel}</span>
      <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {formatShortDuration(Math.max(0, session.session_duration ?? 0))}
      </span>
    </span>
  );

  const device = (
    <span className="flex shrink-0 items-center gap-2">
      {session.country && (
        <CountryFlagTooltipIcon
          country={session.country}
          city={session.city}
          region={session.region}
          onClick={event => filterBy(event, "country", session.country)}
        />
      )}
      <BrowserTooltipIcon
        browser={session.browser || "Unknown"}
        browser_version={session.browser_version}
        onClick={event => filterBy(event, "browser", session.browser)}
      />
      <OperatingSystemTooltipIcon
        operating_system={session.operating_system || ""}
        operating_system_version={session.operating_system_version}
        onClick={event => filterBy(event, "operating_system", session.operating_system)}
      />
      <DeviceTypeTooltipIcon
        device_type={session.device_type || ""}
        screen_width={session.screen_width}
        screen_height={session.screen_height}
        onClick={event => filterBy(event, "device_type", session.device_type)}
      />
    </span>
  );

  const channel = (
    <Channel
      channel={session.channel}
      referrer={session.referrer}
      onClick={event => filterBy(event, "channel", session.channel)}
    />
  );

  const page = (parameter: "entry_page" | "exit_page", pathname: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-block max-w-[200px] cursor-pointer truncate hover:opacity-70"
          onClick={event => filterBy(event, parameter, pathname)}
        >
          {truncateString(pathname, 32)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{pathname || "-"}</p>
      </TooltipContent>
    </Tooltip>
  );

  const markers = (
    <>
      {session.errors > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1 tabular-nums">
              <TriangleAlert className="h-3.5 w-3.5" />
              <span>{formatter(session.errors)}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {t("{count, plural, one {# error} other {# errors}}", { count: session.errors })}
          </TooltipContent>
        </Tooltip>
      )}
      {goals.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="success" className="max-w-[180px] gap-1 font-normal">
              <Target className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {goals.length === 1
                  ? goals[0]
                  : t("{count, plural, one {# goal} other {# goals}}", { count: goals.length })}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="mb-0.5 font-medium">{t("Goals completed")}</p>
            {goals.map(goal => (
              <p key={goal}>{goal}</p>
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );

  const counts = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={QUIET_BADGE}>
            <EventTypeIcon type="pageview" />
            <span className="tabular-nums">{formatter(session.pageviews)}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{t("Pageviews")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={QUIET_BADGE}>
            <EventTypeIcon type="custom_event" />
            <span className="tabular-nums">{formatter(interactions)}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{t("Events")}</TooltipContent>
      </Tooltip>
    </>
  );

  const replay = hasReplay && (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="smIcon"
          className="h-6 w-7 shrink-0"
          aria-label={t("Watch Session Replay")}
          onClick={event => {
            event.stopPropagation();
            setReplayOpen(true);
          }}
        >
          <Video className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("Watch Session Replay")}</TooltipContent>
    </Tooltip>
  );

  const Chevron = expanded ? ChevronDown : ChevronRight;
  const chevron = <Chevron className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" strokeWidth={3} />;

  return (
    <div className="border-t border-neutral-100 first:border-t-0 dark:border-neutral-850">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className="cursor-pointer px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-neutral-400"
        onClick={() => setExpanded(open => !open)}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded(open => !open);
          }
        }}
      >
        {/* Narrow screens: two lines, entry and exit pages left to the details. */}
        <div className="flex flex-col gap-2 py-2.5 md:hidden">
          <div className="flex items-center justify-between gap-2">
            {when}
            <div className="flex items-center gap-1.5">
              {markers}
              {chevron}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {device}
            {channel}
            {counts}
            {replay}
          </div>
        </div>

        {/* Wide screens: one line. */}
        <div className="hidden h-11 items-center gap-2.5 md:flex">
          {/* A fixed column so the rows line up; the weekday needs more of it. */}
          <span className={cn("shrink-0", showWeekday ? "w-[158px]" : "w-[124px]")}>{when}</span>
          {device}
          <span className="shrink-0">{channel}</span>
          <div className="flex min-w-0 flex-1 items-center text-xs text-neutral-500 dark:text-neutral-400">
            {page("entry_page", session.entry_page)}
            <ArrowRight className="mx-2 h-3 w-3 shrink-0" />
            {page("exit_page", session.exit_page)}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {markers}
            {counts}
          </div>
          <span className="flex w-7 shrink-0 justify-center">{replay}</span>
          {chevron}
        </div>
      </div>

      {expanded && <SessionDetails session={session} userId={userId} />}

      {hasReplay && <ReplayDrawer sessionId={session.session_id} open={replayOpen} onOpenChange={setReplayOpen} />}
    </div>
  );
}
