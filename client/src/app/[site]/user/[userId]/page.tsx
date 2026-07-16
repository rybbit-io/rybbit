"use client";

import { useExtracted } from "next-intl";
import { SessionsList } from "@/components/Sessions/SessionsList";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useUserInfo } from "../../../../api/analytics/hooks/userGetInfo";
import { useGetSessions, useGetUserSessionCount } from "../../../../api/analytics/hooks/useGetUserSessions";
import { DateSelector } from "../../../../components/DateSelector/DateSelector";
import { Button } from "../../../../components/ui/button";
import { canGoForward, goBack, goForward, useStore } from "../../../../lib/store";
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
import { UserHeader } from "./components/UserHeader";
import { UserSidebar } from "./components/UserSidebar";
import { UserStatBand } from "./components/UserStatBand";
import { Badge } from "../../../../components/ui/badge";
import { Pagination } from "../../../../components/pagination";
import { Skeleton } from "../../../../components/ui/skeleton";
import { generateName } from "../../../../components/Avatar";
import { formatter, getUserDisplayName } from "../../../../lib/utils";
import { UserJourneys } from "./components/UserJourneys";
import { UserTopPages } from "./components/UserTopPages";

const LIMIT = 25;

export default function UserPage() {
  const t = useExtracted();

  const { userId: rawUserId, site } = useParams();
  const { time, setTime } = useStore();
  const userId = (() => {
    const value = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!value) return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  const [page, setPage] = useState(1);
  const sessionsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useUserInfo(Number(site), userId);
  const { data: sessionCount, isLoading: isLoadingCalendar } = useGetUserSessionCount(userId);
  const { data: sessionsData, isLoading: isLoadingSessions } = useGetSessions({
    userId,
    page: page,
    limit: LIMIT + 1,
  });

  const allSessions = sessionsData?.data || [];
  const hasNextPage = allSessions.length > LIMIT;
  const sessions = allSessions.slice(0, LIMIT);
  const hasPrevPage = page > 1;

  const { getRegionName } = useGetRegionName();

  // Same resolution the session cards use; before user info arrives, fall back
  // to the deterministic generated name for the route id
  const displayName = data ? getUserDisplayName(data) : generateName(userId);

  useSetPageTitle(isLoading ? "User" : displayName);

  // Bottom pagination: restore context by jumping back to the top of the list
  const handleBottomPageChange = (nextPage: number) => {
    setPage(nextPage);
    sessionsRef.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="p-2 md:p-4 max-w-[1200px] mx-auto">
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/${site}/users`}>{t("Users")}</Link>
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

      {/* Toolbar */}
      <div className="flex items-center gap-2 mt-2">
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
              disabled={time.mode === "past-minutes"}
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
      <Filters availableFilters={USER_DETAIL_PAGE_FILTERS} />

      <UserHeader userId={userId} displayName={displayName} data={data} isLoading={isLoading} />

      <UserStatBand data={data} isLoading={isLoading} />

      {/* Main content leads in the DOM so activity comes first on mobile;
          row-reverse puts the profile rail back on the left on desktop */}
      <div className="flex flex-col gap-4 lg:flex-row-reverse">
        <div className="flex-1 min-w-0 space-y-4">
          <UserTopPages userId={userId} />
          <UserJourneys userId={userId} />
          <div ref={sessionsRef} className="scroll-mt-4 space-y-3">
            <SessionsList
              sessions={sessions}
              isLoading={isLoadingSessions}
              page={page}
              onPageChange={setPage}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              userId={userId}
              headerElement={
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t("Sessions")}</h2>
                  {!isLoading && data?.sessions != null && (
                    <Badge variant="secondary" className="tabular-nums" title={data.sessions.toLocaleString()}>
                      {formatter(data.sessions)}
                    </Badge>
                  )}
                </div>
              }
            />
            {!isLoadingSessions && sessions.length >= 10 && (hasNextPage || hasPrevPage) && (
              <Pagination
                page={page}
                onPageChange={handleBottomPageChange}
                hasPreviousPage={hasPrevPage}
                hasNextPage={hasNextPage}
              />
            )}
          </div>
        </div>

        <UserSidebar
          data={data}
          isLoading={isLoading}
          sessionCount={sessionCount?.data ?? []}
          isLoadingCalendar={isLoadingCalendar}
          getRegionName={getRegionName}
        />
      </div>
    </div>
  );
}
