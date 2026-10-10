"use client";

import { ArrowRight, ChevronRight, Funnel, MousePointerClick, Video } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { GetSessionsResponse } from "@/api/analytics/endpoints";
import { useGetEventNames } from "@/api/analytics/hooks/events/useGetEventNames";
import { useGetFunnels } from "@/api/analytics/hooks/funnels/useGetFunnels";
import { useGetGoalSessions } from "@/api/analytics/hooks/goals/useGetGoalSessions";
import { useGetGoalTimeSeries } from "@/api/analytics/hooks/goals/useGetGoalTimeSeries";
import { Avatar } from "@/components/Avatar";
import { ChannelIcon, extractDomain } from "@/components/Channel";
import { describeComparisonWindow } from "@/components/DateSelector/rangeFields";
import { Pagination } from "@/components/pagination";
import { ReplayDrawer } from "@/components/Sessions/ReplayDrawer";
import { ChartLegend } from "@/components/site/ChartLegend";
import { PivotActions } from "@/components/site/PivotActions";
import { CountryFlagTooltipIcon } from "@/components/TooltipIcons/TooltipIcons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";
import { usePivotHref } from "@/hooks/usePivotHref";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { useStore, useTimezone } from "@/lib/store";
import { getUserDisplayName } from "@/lib/utils";
import { funnelRefs, goalPivotFilters, LedgerRow } from "../utils/goalLedger";
import { COMPARISON_COLOR, GoalConversionsChart } from "./GoalConversionsChart";
import { TrendPoint } from "./GoalTrendBars";

const SESSIONS_PER_PAGE = 5;
const MUTED = "text-neutral-500 dark:text-neutral-400";

/** A chip that leads to another page's object: a funnel that has this goal as a step, the goal's event. */
function CrossLink({ href, icon, label, sub }: { href: string; icon: ReactNode; label: string; sub?: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-150 px-2 text-xs text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800/80 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0 [&_svg]:text-neutral-500 dark:[&_svg]:text-neutral-400"
    >
      {icon}
      <span className="truncate font-medium">{label}</span>
      {sub && <span className={MUTED}>{sub}</span>}
    </Link>
  );
}

function ConvertedSession({ session, basePath }: { session: GetSessionsResponse[number]; basePath: string }) {
  const t = useExtracted();
  const timezone = useTimezone();
  const { hour12, formatDateTime } = useDateTimeFormat();
  const [replayOpen, setReplayOpen] = useState(false);

  const start = DateTime.fromSQL(session.session_start, { zone: "utc" });
  const end = DateTime.fromSQL(session.session_end, { zone: "utc" });
  const userId = session.identified_user_id || session.user_id;
  const pageviews = Number(session.pageviews) || 0;

  return (
    <li className="flex items-center gap-2.5 border-b border-neutral-100 px-3 py-2 last:border-b-0 dark:border-neutral-800">
      <Avatar size={24} id={session.user_id} lastActiveTime={end} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`${basePath}/user/${encodeURIComponent(userId)}`}
            className="truncate text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
          >
            {getUserDisplayName(session)}
          </Link>
          {session.country && (
            <CountryFlagTooltipIcon country={session.country} city={session.city} region={session.region} />
          )}
        </div>
        <div className={`flex min-w-0 items-center gap-1 text-xs ${MUTED}`}>
          <ChannelIcon channel={session.channel} className="h-3 w-3 shrink-0" />
          <span className="max-w-[40%] shrink-0 truncate">{extractDomain(session.referrer) ?? session.channel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{session.entry_page || "-"}</span>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{session.exit_page || "-"}</span>
        </div>
      </div>
      <div className="shrink-0 text-right text-xs tabular-nums">
        <div className="text-neutral-700 dark:text-neutral-200">
          {formatDateTime(start, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12,
            timeZone: timezone,
          })}
        </div>
        <div className={MUTED}>
          {formatShortDuration(Math.max(0, Math.floor(end.diff(start).as("seconds"))))} ·{" "}
          {t("{count, plural, one {# page} other {# pages}}", { count: pageviews })}
        </div>
      </div>
      {session.has_replay === 1 && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            className="shrink-0 text-neutral-600 dark:text-neutral-300"
            aria-label={t("Watch Session Replay")}
            onClick={() => setReplayOpen(true)}
          >
            <Video />
          </Button>
          <ReplayDrawer sessionId={session.session_id} open={replayOpen} onOpenChange={setReplayOpen} />
        </>
      )}
    </li>
  );
}

function ConvertedSessions({ row, siteId, sessionsHref }: { row: LedgerRow; siteId: number; sessionsHref?: string }) {
  const t = useExtracted();
  const time = useStore(state => state.time);
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);
  const [page, setPage] = useState(1);

  // One row past the page says whether there is a next page without a count query.
  const { data, isLoading, isError } = useGetGoalSessions({
    goalId: row.goal.goalId,
    siteId,
    time,
    page,
    limit: SESSIONS_PER_PAGE + 1,
    enabled: true,
  });
  const sessions = (data ?? []).slice(0, SESSIONS_PER_PAGE);
  const hasNextPage = (data ?? []).length > SESSIONS_PER_PAGE;
  const basePath = privateKey ? `/${site}/${privateKey}` : `/${site}`;

  return (
    <div className="flex min-w-0 flex-col lg:border-l lg:border-neutral-100 lg:pl-2 lg:dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3 px-3 pb-2">
        <div className="text-sm font-medium">
          {t("Converted sessions")}
          <span className={`ml-2 font-normal tabular-nums ${MUTED}`}>{row.conversions.toLocaleString()}</span>
        </div>
        {sessionsHref && (
          <Link
            href={sessionsHref}
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-neutral-700 hover:underline dark:text-neutral-200"
          >
            {t("Open in Sessions")}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 px-3 py-1">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded" />
          ))}
        </div>
      ) : isError ? (
        <p className={`px-3 py-6 text-center text-sm ${MUTED}`}>{t("The converted sessions could not be loaded.")}</p>
      ) : sessions.length === 0 ? (
        <p className={`px-3 py-6 text-center text-sm ${MUTED}`}>
          {t("No sessions converted to this goal in the selected time period.")}
        </p>
      ) : (
        <ul>
          {sessions.map(session => (
            <ConvertedSession key={session.session_id} session={session} basePath={basePath} />
          ))}
        </ul>
      )}

      {(page > 1 || hasNextPage) && (
        <Pagination
          className="mt-2 px-3"
          page={page}
          onPageChange={setPage}
          hasPreviousPage={page > 1}
          hasNextPage={hasNextPage}
        />
      )}
    </div>
  );
}

interface GoalExpandedProps {
  row: LedgerRow;
  siteId: number;
  /** This period's series for the goal: the one the row's small bars already drew. */
  timeSeries?: TrendPoint[];
  isLoadingTimeSeries: boolean;
  /** "Conversions per day", from the page's interval. */
  chartTitle: string;
}

/**
 * What opens under a ledger row: where else the goal's target is used, the
 * people behind the number, the goal over time against the comparison period,
 * and the sessions that converted.
 */
export function GoalExpanded({ row, siteId, timeSeries, isLoadingTimeSeries, chartTitle }: GoalExpandedProps) {
  const t = useExtracted();
  const { goal } = row;
  const time = useStore(state => state.time);
  const previousTime = useStore(state => state.previousTime);
  const timezone = useTimezone();
  const pivotHref = usePivotHref();

  const { data: funnels } = useGetFunnels(siteId);
  const refs = funnelRefs(goal, funnels ?? []);

  const eventName = goal.goalType === "event" ? goal.config.eventName : undefined;
  const { data: eventNames } = useGetEventNames();
  const eventCount = eventName ? eventNames?.find(event => event.eventName === eventName)?.count : undefined;

  const { data: previousSeries } = useGetGoalTimeSeries({ goalIds: [goal.goalId], periodTime: "previous" });

  const pivotFilters = goalPivotFilters(goal);
  // usePivotHref only builds Sessions, Users and Replay links. The funnels and
  // events pages read the same query string, so their links are the Sessions
  // link with the last path segment swapped.
  const linkTo = (route: string, href: string) => href.replace(/\/sessions(?=\?|$)/, `/${route}`);
  const funnelsHref = linkTo("funnels", pivotHref("sessions"));
  const eventHref = eventName
    ? linkTo("events", pivotHref("sessions", [{ parameter: "event_name", type: "equals", value: [eventName] }]))
    : undefined;

  const hasCrossLinks = refs.length > 0 || !!eventHref;
  const currentWindow = describeComparisonWindow(time, time, timezone);
  const comparisonWindow = describeComparisonWindow(previousTime, time, timezone);

  return (
    <div className="bg-neutral-50 px-3 pb-4 pt-1 dark:bg-neutral-800/30 md:px-4">
      {(hasCrossLinks || pivotFilters) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {hasCrossLinks && <span className={`mr-1 text-xs ${MUTED}`}>{t("Also in")}</span>}
            {refs.map(ref => (
              <CrossLink
                key={ref.funnel.id}
                href={funnelsHref}
                icon={<Funnel />}
                label={ref.funnel.name}
                sub={t("step {step} of {total}", { step: String(ref.step), total: String(ref.of) })}
              />
            ))}
            {eventHref && eventName && (
              <CrossLink
                href={eventHref}
                icon={<MousePointerClick />}
                label={eventName}
                sub={
                  eventCount === undefined
                    ? undefined
                    : t("{count, plural, one {# event} other {# events}}", { count: eventCount })
                }
              />
            )}
          </div>
          {pivotFilters && (
            <PivotActions filters={pivotFilters} actions={["sessions", "users", "replays", "segment"]} />
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,470px)]">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-2">
            <div className="text-sm font-medium">{chartTitle}</div>
            <ChartLegend
              items={[
                { id: "current", label: currentWindow ?? t("This period"), color: "hsl(var(--dataviz))" },
                ...(previousTime
                  ? [{ id: "previous", label: comparisonWindow ?? t("Comparison period"), color: COMPARISON_COLOR }]
                  : []),
              ]}
            />
          </div>
          {isLoadingTimeSeries ? (
            <Skeleton className="min-h-[214px] w-full flex-1 rounded-md" />
          ) : (
            // As tall as the session list beside it, and never shorter than a readable chart.
            <div className="min-h-[214px] w-full flex-1">
              <GoalConversionsChart data={timeSeries ?? []} previousData={previousSeries} />
            </div>
          )}
        </div>

        <ConvertedSessions
          row={row}
          siteId={siteId}
          sessionsHref={pivotFilters ? pivotHref("sessions", pivotFilters) : undefined}
        />
      </div>
    </div>
  );
}
