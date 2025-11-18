"use client";

import { SessionsList } from "@/components/Sessions/SessionsList";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Clock,
  Eye,
  Files,
  Monitor,
  MousePointerClick,
  Smartphone,
  Tablet,
} from "lucide-react";
import { DateTime } from "luxon";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useUserInfo } from "../../../../api/analytics/userGetInfo";
import { useGetSessions, useGetUserSessionCount } from "../../../../api/analytics/useGetUserSessions";
import { Avatar, generateName } from "../../../../components/Avatar";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
import { formatDuration } from "../../../../lib/dateTimeUtils";
import { useGetRegionName } from "../../../../lib/geo";
import { getCountryName, getLanguageName } from "../../../../lib/utils";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import { MobileSidebar } from "../../components/Sidebar/MobileSidebar";
import { VisitCalendar } from "./components/Calendar";
import { EventIcon, PageviewIcon } from "../../../../components/EventIcons";

const LIMIT = 25;

export default function UserPage() {
  useSetPageTitle("Rybbit · User");

  const router = useRouter();
  const { userId } = useParams();
  const { site } = useParams();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUserInfo(Number(site), userId as string);

  const { data: sessionCount } = useGetUserSessionCount(userId as string);

  const { data: sessionsData, isLoading: isLoadingSessions } = useGetSessions(userId as string, page, LIMIT + 1);
  const allSessions = sessionsData?.data || [];
  const hasNextPage = allSessions.length > LIMIT;
  const sessions = allSessions.slice(0, LIMIT);
  const hasPrevPage = page > 1;

  const { getRegionName } = useGetRegionName();

  const handleBackClick = () => {
    router.push(`/${site}/users`);
  };

  const name = generateName(userId as string);

  return (
    <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
      <MobileSidebar />
      <Button onClick={handleBackClick} className="w-max" variant="ghost">
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Button>
      <div className="mb-4">
        <h1 className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar size={48} id={userId as string} />
            <div>
              <div className="text-lg font-bold">{name}</div>
              <span className="text-neutral-600 dark:text-neutral-300 text-sm">ID: {userId}</span>
            </div>
          </div>
          {data?.ip && (
            <Badge variant="outline" className="flex gap-1 text-neutral-600 dark:text-neutral-300">
              IP: <span className="text-neutral-900 dark:text-neutral-100">{data?.ip}</span>
            </Badge>
          )}
        </h1>
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-750 text-sm mb-3">
          {isLoading ? (
            // Skeleton loading state for user info
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="grid grid-cols-[100px_auto] gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <>
                    <Skeleton key={`label-${index}`} className="h-4 w-16" />
                    <Skeleton key={`value-${index}`} className="h-4 w-24" />
                  </>
                ))}
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <>
                    <Skeleton key={`label2-${index}`} className="h-4 w-20" />
                    <Skeleton key={`value2-${index}`} className="h-4 w-32" />
                  </>
                ))}
              </div>
            </div>
          ) : (
            // Actual user info data
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="grid grid-cols-[100px_auto] gap-2">
                {/* <span className=" text-neutral-100">User ID:</span>
                <CopyText
                  text={userId as string}
                  maxLength={24}
                  className="inline-flex text-neutral-300"
                /> */}
                <span className="text-neutral-900 dark:text-neutral-100">Country:</span>
                <div className="text-neutral-600 dark:text-neutral-300 flex gap-1 items-center">
                  <CountryFlag country={data?.country || ""} />
                  {data?.country ? getCountryName(data.country) : "N/A"}
                </div>
                <span className=" text-neutral-900 dark:text-neutral-100">Region:</span>
                <div className="text-neutral-600 dark:text-neutral-300">{data?.region ? getRegionName(data.region) : "N/A"}</div>
                <span className=" text-neutral-900 dark:text-neutral-100">City:</span>
                <div className="text-neutral-600 dark:text-neutral-300">{data?.city ?? "N/A"}</div>
                <span className=" text-neutral-900 dark:text-neutral-100">Language:</span>
                <div className="text-neutral-600 dark:text-neutral-300">{data?.language ? getLanguageName(data.language) : "N/A"}</div>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className=" text-neutral-900 dark:text-neutral-100">Device Type:</span>
                <div className="text-neutral-600 dark:text-neutral-300 flex gap-1 items-center">
                  {data?.device_type === "Desktop" && <Monitor className="w-4 h-4" />}
                  {data?.device_type === "Mobile" && <Smartphone className="w-4 h-4" />}
                  {data?.device_type === "Tablet" && <Tablet className="w-4 h-4" />}
                  {data?.device_type}
                </div>
                <span className=" text-neutral-900 dark:text-neutral-100">Browser:</span>
                <div className="flex gap-1 text-neutral-600 dark:text-neutral-300 items-center">
                  <Browser browser={data?.browser || "Unknown"} />
                  {data?.browser}
                  {data?.browser_version && <span className="ml-1">v{data?.browser_version}</span>}
                </div>
                <span className="text-neutral-900 dark:text-neutral-100">OS:</span>
                <div className="flex gap-1 text-neutral-600 dark:text-neutral-300 items-center">
                  <OperatingSystem os={data?.operating_system || ""} />
                  {data?.operating_system}
                  {data?.operating_system_version && <span className="ml-1">v{data?.operating_system_version}</span>}
                </div>
                <span className="text-neutral-900 dark:text-neutral-100">Screen:</span>
                <div className="flex gap-1 text-neutral-600 dark:text-neutral-300">
                  {data?.screen_width} x {data?.screen_height}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 justify-between">
          {isLoading ? (
            // Skeleton loading state
            <>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-750 flex-grow"
                >
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <Skeleton className="w-4 h-4" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </>
          ) : (
            // Actual data
            <>
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-750 flex-grow">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Avg. Session Duration
                </div>
                <div className="font-semibold">{data?.duration ? formatDuration(data.duration) : "N/A"}</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Files className="w-4 h-4" />
                  Sessions
                </div>
                <div className="font-semibold">{data?.sessions}</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <PageviewIcon />
                  Pageviews
                </div>
                <div className="font-semibold">{data?.pageviews}</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <EventIcon />
                  Events
                </div>
                <div className="font-semibold">{data?.events}</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  First Seen
                </div>
                <div className="font-semibold">
                  {DateTime.fromSQL(data?.first_seen ?? "", { zone: "utc" })
                    .toLocal()
                    .toLocaleString(DateTime.DATETIME_SHORT)}
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <CalendarCheck className="w-4 h-4" />
                  Last Seen
                </div>
                <div className="font-semibold">
                  {DateTime.fromSQL(data?.last_seen ?? "", { zone: "utc" })
                    .toLocal()
                    .toLocaleString(DateTime.DATETIME_SHORT)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-100 dark:border-neutral-800 h-[150px]">
        <VisitCalendar sessionCount={sessionCount?.data ?? []} />
      </div>

      <h2 className="text-lg font-bold mb-4">Sessions</h2>
      <SessionsList
        sessions={sessions}
        isLoading={isLoadingSessions}
        page={page}
        onPageChange={setPage}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        userId={userId as string}
      />
    </div>
  );
}
