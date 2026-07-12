"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useExtracted, useLocale } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useUserInfo } from "@/api/analytics/hooks/userGetInfo";
import { useGetSessions, useGetUserSessionCount } from "@/api/analytics/hooks/useGetUserSessions";
import { generateName } from "@/components/Avatar";
import { DateSelector } from "@/components/DateSelector/DateSelector";
import { Time } from "@/components/DateSelector/types";
import { ErrorState } from "@/components/ErrorState";
import { SessionsList } from "@/components/Sessions/SessionsList";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { USER_DETAIL_PAGE_FILTERS } from "@/lib/filterGroups";
import { useGetRegionName } from "@/lib/geo";
import { canGoForward, goBack, goForward, useStore } from "@/lib/store";
import { userStore } from "@/lib/userStore";

import { Filters } from "../../components/SubHeader/Filters/Filters";
import { NewFilterButton } from "../../components/SubHeader/Filters/NewFilterButton";
import { MobileSidebar } from "../../components/Sidebar/MobileSidebar";
import { UserSidebar } from "./components/UserSidebar";
import { UserSummary } from "./components/UserSummary";
import { UserTopPages } from "./components/UserTopPages";

const LIMIT = 25;

function DateRangeControls({ time, setTime }: { time: Time; setTime: (time: Time) => void }) {
  const t = useExtracted();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <DateSelector time={time} setTime={setTime} />
      <div className="flex items-center">
        <Button
          variant="secondary"
          size="icon"
          onClick={goBack}
          disabled={time.mode === "past-minutes"}
          className="h-8 w-8 rounded-r-none"
          aria-label={t("Previous date range")}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={goForward}
          disabled={!canGoForward(time)}
          className="-ml-px h-8 w-8 rounded-l-none"
          aria-label={t("Next date range")}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export default function UserPage() {
  const t = useExtracted();
  const locale = useLocale();
  const { userId: rawUserId, site } = useParams();
  const { user } = userStore();
  const { filters, time, setTime } = useStore();
  const { getRegionName } = useGetRegionName();
  const activityRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);

  const userId = (() => {
    const value = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!value) return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();

  const { data, isLoading, error: userInfoError, refetch: refetchUserInfo } = useUserInfo(Number(site), userId);
  const {
    data: sessionCount,
    isLoading: isSessionCountLoading,
    isError: isSessionCountError,
  } = useGetUserSessionCount(userId);
  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    error: sessionsError,
    refetch: refetchSessions,
  } = useGetSessions({
    userId,
    page,
    limit: LIMIT + 1,
  });

  const allSessions = sessionsData?.data || [];
  const hasNextPage = allSessions.length > LIMIT;
  const sessions = allSessions.slice(0, LIMIT);
  const hasPrevPage = page > 1;

  const traitsUsername = typeof data?.traits?.username === "string" ? data.traits.username : undefined;
  const traitsName = typeof data?.traits?.name === "string" ? data.traits.name : undefined;
  const isIdentified = !!data?.identified_user_id;
  const displayName = traitsUsername || traitsName || (isIdentified ? userId : generateName(userId));

  useSetPageTitle(isLoading ? "User" : displayName);

  useEffect(() => {
    setPage(1);
  }, [filters, time]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      activityRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  };

  const sessionHeading = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="sessions-heading" className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
          {t("Sessions")}
        </h2>
        {!isLoading && data && (
          <Badge variant="secondary" className="font-normal tabular-nums">
            {t("{count} in range", { count: new Intl.NumberFormat(locale).format(data.sessions) })}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {t("Open a session to inspect its pages, events, and replay.")}
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] p-2 md:p-4">
      <div className="space-y-3">
        <header className="space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <MobileSidebar />
            <Breadcrumb className="min-w-0 flex-1">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/${site}/users`}>{t("Users")}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate">{isLoading ? t("Loading...") : displayName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="hidden md:block">
              <DateRangeControls time={time} setTime={setTime} />
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <NewFilterButton availableFilters={USER_DETAIL_PAGE_FILTERS} />
            <div className="ml-auto">
              <DateRangeControls time={time} setTime={setTime} />
            </div>
          </div>
          <div className="hidden items-start gap-2 md:flex">
            <NewFilterButton availableFilters={USER_DETAIL_PAGE_FILTERS} />
            <div className="min-w-0 flex-1">
              <Filters availableFilters={USER_DETAIL_PAGE_FILTERS} />
            </div>
          </div>
          <div className="md:hidden">
            <Filters availableFilters={USER_DETAIL_PAGE_FILTERS} />
          </div>
        </header>

        {userInfoError && !data ? (
          <Card className="flex min-h-[320px] items-center">
            <ErrorState
              title={t("User details could not be loaded")}
              message={t("Check the selected date range or try loading this user again.")}
              refetch={refetchUserInfo}
            />
          </Card>
        ) : (
          <>
            <UserSummary
              data={data}
              displayName={displayName}
              isLoading={isLoading}
              userId={userId}
              showActions={!!user}
            />

            <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
              <main className="min-w-0 space-y-5">
                <UserTopPages userId={userId} />

                <div ref={activityRef} className="scroll-mt-4">
                  {sessionsError ? (
                    <section aria-labelledby="sessions-heading">
                      <div className="mb-3">{sessionHeading}</div>
                      <Card>
                        <ErrorState
                          title={t("Sessions could not be loaded")}
                          message={t("The user's session history is temporarily unavailable.")}
                          refetch={refetchSessions}
                        />
                      </Card>
                    </section>
                  ) : (
                    <SessionsList
                      sessions={sessions}
                      isLoading={isLoadingSessions}
                      page={page}
                      onPageChange={handlePageChange}
                      hasNextPage={hasNextPage}
                      hasPrevPage={hasPrevPage}
                      userId={userId}
                      headerElement={sessionHeading}
                      emptyMessage={t("No sessions match this date range or the active filters.")}
                      pageSize={8}
                    />
                  )}
                </div>
              </main>

              <UserSidebar
                data={data}
                isLoading={isLoading}
                sessionCount={sessionCount?.data ?? []}
                isSessionCountLoading={isSessionCountLoading}
                sessionCountError={isSessionCountError}
                getRegionName={getRegionName}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
