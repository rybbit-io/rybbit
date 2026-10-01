"use client";

import { useExtracted } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useUserInfo } from "../../../../api/analytics/hooks/userGetInfo";
import { useGetSessions, useGetUserSessionCount } from "../../../../api/analytics/hooks/useGetUserSessions";
import { useUserSummary } from "../../../../api/analytics/hooks/useUserProfile";
import { DateSelector } from "../../../../components/DateSelector/DateSelector";
import { AnalysisBar } from "../../../../components/site/AnalysisBar";
import { BreakdownControl } from "../../../../components/site/BreakdownControl";
import { Button } from "../../../../components/ui/button";
import { canGoBack, canGoForward, goBack, goForward, useStore } from "../../../../lib/store";
import { USER_DETAIL_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { Filters } from "../../components/SubHeader/Filters/Filters";
import { NewFilterButton } from "../../components/SubHeader/Filters/NewFilterButton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../../../components/ui/breadcrumb";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
import { useGetRegionName } from "../../../../lib/geo";
import { MobileSidebar } from "../../components/Sidebar/MobileSidebar";
import { ActivityCalendar } from "./components/ActivityCalendar";
import { firstActiveDay } from "./components/calendarLayout";
import { SessionBreakdown } from "./components/sessionGroups";
import { UserErrorInsight } from "./components/UserErrorInsight";
import { UserGoals } from "./components/UserGoals";
import { UserHeader } from "./components/UserHeader";
import { SESSIONS_PAGE_SIZE, UserSessions } from "./components/UserSessions";
import { UserSidebar } from "./components/UserSidebar";
import { UserStatBand } from "./components/UserStatBand";
import { UserStepper } from "./components/UserStepper";
import { Skeleton } from "../../../../components/ui/skeleton";
import { generateName } from "../../../../components/Avatar";
import { getUserDisplayName } from "../../../../lib/utils";
import { UserJourneys } from "./components/UserJourneys";
import { UserTopPages } from "./components/UserTopPages";

export default function UserPage() {
  const t = useExtracted();

  const { userId: rawUserId, site } = useParams();
  const { time, setTime, privateKey } = useStore();
  const userId = (() => {
    const value = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!value) return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  const [breakdown, setBreakdown] = useState<SessionBreakdown>("day");
  // The day picked on the activity calendar, remembered with the user it was
  // picked for: stepping to another profile starts without one.
  const [pickedDay, setPickedDay] = useState<{ userId: string; day: string } | null>(null);
  const selectedDay = pickedDay?.userId === userId ? pickedDay.day : null;

  const { data, isLoading } = useUserInfo(Number(site), userId);
  // The route can still be a device fingerprint after that device has been
  // identified — the server resolves the alias for user info, so every other panel
  // has to query the identity it resolved to or they all come back empty. Anonymous
  // visitors have no identified_user_id, so they keep querying the route id.
  const queryUserId = data?.identified_user_id || userId;
  const {
    data: sessionCount,
    isLoading: isLoadingCalendar,
    error: calendarError,
    refetch: refetchCalendar,
  } = useGetUserSessionCount(queryUserId);
  const { data: summary } = useUserSummary(queryUserId);

  // The user's first day on the site, from the calendar's full history. Their
  // profile for that one day is their first touch, whatever period is selected.
  const dayCounts = (sessionCount ?? []).map(row => ({
    date: String(row.date).slice(0, 10),
    sessions: Number(row.sessions),
  }));
  const firstDay = firstActiveDay(dayCounts);
  const firstTouchQuery = useUserInfo(Number(site), queryUserId, {
    time: firstDay ? { mode: "day", day: firstDay } : undefined,
    enabled: !!firstDay,
  });
  const firstTouch = firstDay ? firstTouchQuery.data : undefined;

  // The first page of the period's sessions, newest first: the same request
  // the session list makes for its first page, so it is answered from cache.
  const { data: latestSessions } = useGetSessions({ userId: queryUserId, page: 1, limit: SESSIONS_PAGE_SIZE + 1 });
  const latestReplaySessionId = latestSessions?.find(session => session.has_replay === 1)?.session_id;

  const { getRegionName } = useGetRegionName();

  // Same resolution the session cards use; before user info arrives, fall back
  // to the deterministic generated name for the route id
  const displayName = data ? getUserDisplayName(data) : generateName(userId);

  useSetPageTitle(isLoading ? "User" : displayName);

  // What the session list holds in all: the day's sessions when one is picked
  // on the calendar, otherwise the period's.
  const totalSessions = selectedDay
    ? dayCounts.find(day => day.date === selectedDay)?.sessions
    : (summary?.sessions ?? data?.sessions);

  const usersHref = privateKey ? `/${site}/${privateKey}/users` : `/${site}/users`;

  return (
    <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={usersHref}>{t("Users")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">
                {isLoading ? <Skeleton className="h-4 w-28 rounded" /> : displayName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <UserStepper userIds={[userId, queryUserId]} />
      </div>

      {/* Toolbar */}
      <div>
        <div className="flex items-center gap-2">
          <MobileSidebar />
          <div className="hidden md:block">
            <NewFilterButton availableFilters={USER_DETAIL_PAGE_FILTERS} />
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <DateSelector time={time} setTime={setTime} />
            <div className="flex items-center">
              <Button
                variant="secondary"
                size="icon"
                onClick={goBack}
                disabled={!canGoBack(time)}
                className="rounded-r-none h-8 w-8"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={goForward}
                disabled={!canGoForward(time)}
                className="rounded-l-none -ml-px h-8 w-8"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
        <div className="md:hidden mt-2">
          <NewFilterButton availableFilters={USER_DETAIL_PAGE_FILTERS} />
        </div>
        {/* The chip row takes its gap only when it has chips. */}
        <div className="[&>div:not(:empty)]:mt-2">
          <Filters availableFilters={USER_DETAIL_PAGE_FILTERS} />
        </div>
      </div>

      <UserHeader
        userId={userId}
        queryUserId={queryUserId}
        displayName={displayName}
        data={data}
        isLoading={isLoading}
        latestReplaySessionId={latestReplaySessionId}
      />

      <UserStatBand userId={queryUserId} />

      <AnalysisBar
        breakdown={
          <BreakdownControl<SessionBreakdown>
            value={breakdown}
            onChange={setBreakdown}
            options={[
              { value: "day", label: t("Day") },
              { value: "week", label: t("Week") },
              { value: "none", label: t("None") },
            ]}
          />
        }
      />

      <UserErrorInsight userId={queryUserId} />

      {/* Main content leads in the DOM so activity comes first on mobile;
          row-reverse puts the profile rail back on the left on desktop */}
      <div className="flex flex-col gap-3 lg:flex-row-reverse">
        {/* A container, so the cards inside pair up by the room this column
            has rather than by the viewport: the rail and the app sidebar both
            take from it. */}
        <div className="@container flex-1 min-w-0 space-y-3">
          <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[minmax(0,1fr)_322px]">
            <ActivityCalendar
              sessionCount={sessionCount ?? []}
              isLoading={isLoadingCalendar}
              error={calendarError}
              refetch={() => void refetchCalendar()}
              activeDays={summary?.active_days}
              selectedDay={selectedDay}
              onSelectDay={day => setPickedDay(day ? { userId, day } : null)}
            />
            <UserGoals userId={queryUserId} />
          </div>
          <UserTopPages userId={queryUserId} />
          <UserJourneys userId={queryUserId} />
          <UserSessions
            key={JSON.stringify([queryUserId, selectedDay, time])}
            userId={queryUserId}
            breakdown={breakdown}
            selectedDay={selectedDay}
            onClearDay={() => setPickedDay(null)}
            totalSessions={totalSessions}
          />
        </div>

        <UserSidebar
          userId={queryUserId}
          data={data}
          isLoading={isLoading}
          firstTouch={firstTouch}
          isLoadingFirstTouch={isLoadingCalendar || (!!firstDay && firstTouchQuery.isLoading)}
          getRegionName={getRegionName}
        />
      </div>
    </div>
  );
}
