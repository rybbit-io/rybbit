"use client";

import { Rewind, X } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useRef, useState } from "react";
import { useGetSessions } from "../../../../../api/analytics/hooks/useGetUserSessions";
import { useUserGoals, useUserSessionGoals } from "../../../../../api/analytics/hooks/useUserProfile";
import { Time } from "../../../../../components/DateSelector/types";
import { NothingFound } from "../../../../../components/NothingFound";
import { Pagination } from "../../../../../components/pagination";
import { SessionsList } from "../../../../../components/Sessions/SessionsList";
import { Badge } from "../../../../../components/ui/badge";
import { Card } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { useTimezone } from "../../../../../lib/store";
import { formatter } from "../../../../../lib/utils";
import { SessionBreakdown, SessionGroup, formatGroupDuration, groupSessions, relativeDay } from "./sessionGroups";
import { SessionLedgerRow } from "./SessionLedgerRow";

export const SESSIONS_PAGE_SIZE = 25;

interface UserSessionsProps {
  userId: string;
  breakdown: SessionBreakdown;
  /** The day picked on the activity calendar, or null for the selected period. */
  selectedDay: string | null;
  onClearDay: () => void;
  /** How many sessions the list holds in all, when known. */
  totalSessions: number | undefined;
}

/**
 * This user's sessions, newest first, a page at a time. With a breakdown they
 * are a ledger grouped by day or week, each row marked with its errors and the
 * goals it completed; with none they are the same list the Sessions page
 * shows. Picking a day on the calendar narrows either view to that day.
 *
 * The parent keys this component by user, period and picked day, so the page
 * number starts over whenever what is being listed changes.
 */
export function UserSessions({ userId, breakdown, selectedDay, onClearDay, totalSessions }: UserSessionsProps) {
  const t = useExtracted();
  const zone = useTimezone();
  const { formatDateTime } = useDateTimeFormat();
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const dayTime: Time | undefined = selectedDay ? { mode: "day", day: selectedDay } : undefined;

  // One row past the page size tells whether there is a next page.
  const { data, isLoading } = useGetSessions({
    userId,
    page,
    limit: SESSIONS_PAGE_SIZE + 1,
    timeOverride: dayTime,
  });
  const all = data ?? [];
  const sessions = all.slice(0, SESSIONS_PAGE_SIZE);
  const hasNextPage = all.length > SESSIONS_PAGE_SIZE;
  const hasPrevPage = page > 1;

  const grouped = breakdown !== "none";
  const { data: goals } = useUserGoals(userId);
  // Markers are only drawn in the ledger; the plain list asks for nothing extra.
  const { data: sessionGoals } = useUserSessionGoals(
    userId,
    grouped ? sessions.map(session => session.session_id) : [],
    dayTime
  );

  const goalNames = new Map(
    (goals ?? []).map(goal => [goal.goalId, goal.name || t("Goal #{goalId}", { goalId: String(goal.goalId) })])
  );
  const goalsBySession = new Map(
    (sessionGoals ?? []).map(row => [
      row.session_id,
      row.goal_ids.map(id => goalNames.get(id)).filter((name): name is string => !!name),
    ])
  );

  // Dates are days, not instants: format at noon in the zone.
  const dayAt = (isoDate: string) => DateTime.fromISO(`${isoDate}T12:00:00`, { zone });
  const now = DateTime.now().setZone(zone);
  const formatDay = (isoDate: string) => {
    const day = dayAt(isoDate);
    return formatDateTime(day, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: day.year === now.year ? undefined : "numeric",
      timeZone: zone,
    });
  };

  const groupTitle = (group: SessionGroup) => {
    if (breakdown === "week") {
      return { name: t("Week of {date}", { date: formatDay(group.key) }), date: null };
    }
    const named = relativeDay(group.key, now);
    return named
      ? { name: named === "today" ? t("Today") : t("Yesterday"), date: formatDay(group.key) }
      : { name: formatDay(group.key), date: null };
  };

  const from = (page - 1) * SESSIONS_PAGE_SIZE + 1;
  const to = (page - 1) * SESSIONS_PAGE_SIZE + sessions.length;

  const header = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t("Sessions")}</h2>
      {totalSessions != null && (
        <Badge variant="secondary" className="tabular-nums" title={totalSessions.toLocaleString()}>
          {formatter(totalSessions)}
        </Badge>
      )}
      {selectedDay && (
        <button
          type="button"
          onClick={onClearDay}
          aria-label={t("Showing {day} only. Show the whole period.", { day: formatDay(selectedDay) })}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-neutral-200 px-1.5 text-xs text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-850"
        >
          {formatDay(selectedDay)}
          <X className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
        </button>
      )}
    </div>
  );

  const changePage = (next: number) => {
    setPage(next);
  };
  // Bottom pagination: restore context by jumping back to the top of the list
  const changePageFromBottom = (next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ block: "start" });
  };

  const emptyMessage = selectedDay ? t("No sessions on this day match the filters") : undefined;

  return (
    <div ref={topRef} className="scroll-mt-4 space-y-3">
      {grouped ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {header}
            <div className="flex shrink-0 items-center gap-3">
              {totalSessions != null && sessions.length > 0 && (
                <span className="hidden text-xs tabular-nums text-neutral-500 dark:text-neutral-400 sm:inline">
                  {t("{from}–{to} of {total}", {
                    from: from.toLocaleString(),
                    to: to.toLocaleString(),
                    total: Math.max(totalSessions, to).toLocaleString(),
                  })}
                </span>
              )}
              <Pagination
                className="w-auto"
                page={page}
                onPageChange={changePage}
                hasPreviousPage={hasPrevPage}
                hasNextPage={hasNextPage}
              />
            </div>
          </div>

          {isLoading ? (
            <LedgerSkeleton />
          ) : sessions.length === 0 ? (
            <NothingFound
              icon={<Rewind className="w-10 h-10" />}
              title={t("No sessions found")}
              description={emptyMessage || t("Try a different date range or filter")}
            />
          ) : (
            <Card>
              {groupSessions(sessions, zone, breakdown).map(group => {
                const title = groupTitle(group);
                return (
                  <section
                    key={group.key}
                    className="border-t border-neutral-100 first:border-t-0 dark:border-neutral-850"
                  >
                    <header className="flex min-h-8 items-center justify-between gap-3 bg-neutral-50 px-3 py-1.5 text-xs dark:bg-neutral-850/60">
                      <h3>
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{title.name}</span>
                        {title.date && <span className="text-neutral-500 dark:text-neutral-400"> · {title.date}</span>}
                      </h3>
                      <span className="text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                        {t("{count, plural, one {# session} other {# sessions}}", { count: group.sessions.length })}
                        <span className="hidden sm:inline">
                          {" · "}
                          {formatGroupDuration(group.duration)}
                          {" · "}
                          {t("{count, plural, one {# pageview} other {# pageviews}}", { count: group.pageviews })}
                        </span>
                      </span>
                    </header>
                    {group.sessions.map(session => (
                      <SessionLedgerRow
                        key={session.session_id}
                        session={session}
                        userId={userId}
                        goals={goalsBySession.get(session.session_id) ?? []}
                        showWeekday={breakdown === "week"}
                      />
                    ))}
                  </section>
                );
              })}
            </Card>
          )}
        </div>
      ) : (
        <SessionsList
          sessions={sessions}
          isLoading={isLoading}
          page={page}
          onPageChange={changePage}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          userId={userId}
          emptyMessage={emptyMessage}
          headerElement={header}
        />
      )}

      {!isLoading && sessions.length >= 10 && (hasNextPage || hasPrevPage) && (
        <Pagination
          page={page}
          onPageChange={changePageFromBottom}
          hasPreviousPage={hasPrevPage}
          hasNextPage={hasNextPage}
        />
      )}
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <Card aria-hidden>
      <div className="flex h-8 items-center bg-neutral-50 px-3 dark:bg-neutral-850/60">
        <Skeleton className="h-3 w-28 rounded" />
      </div>
      {[0, 1, 2, 3, 4, 5].map(row => (
        <div
          key={row}
          className="flex h-11 items-center gap-2.5 border-t border-neutral-100 px-3 dark:border-neutral-850"
        >
          <Skeleton className="h-3 w-10 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="hidden h-[21px] w-16 rounded-sm md:block" />
          <Skeleton className="hidden h-3 flex-1 rounded md:block" />
          <Skeleton className="ml-auto h-[21px] w-12 rounded-sm" />
          <Skeleton className="h-[21px] w-12 rounded-sm" />
        </div>
      ))}
    </Card>
  );
}
