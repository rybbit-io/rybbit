"use client";

import SessionsList from "@/components/Sessions/SessionsList";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Clock,
  Files,
  FileText,
  Monitor,
  MousePointerClick,
  Smartphone,
  Tablet,
} from "lucide-react";
import { DateTime } from "luxon";
import { useParams, useRouter } from "next/navigation";
import { useUserInfo } from "../../../../api/analytics/userInfo";
import { useGetUserSessionCount } from "../../../../api/analytics/userSessions";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useSetPageTitle } from "../../../../hooks/useSetPageTitle";
import { useGetRegionName } from "../../../../lib/geo";
import { getCountryName, getLanguageName } from "../../../../lib/utils";
import { formatDuration } from "../../../../lib/dateTimeUtils";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import { VisitCalendar } from "./components/Calendar";
import { Avatar } from "../../../../components/Avatar";
import { MobileSidebar } from "../../components/Sidebar/MobileSidebar";

export default function UserPage() {
  useSetPageTitle("Rybbit · User");

  const router = useRouter();
  const { userId } = useParams();
  const { site } = useParams();

  const { data, isLoading } = useUserInfo(Number(site), userId as string);

  const { data: sessionCount } = useGetUserSessionCount(userId as string);

  const { getRegionName } = useGetRegionName();

  const handleBackClick = () => {
    router.push(`/${site}/users`);
  };

  return (
    <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
      <Button onClick={handleBackClick} className="w-full sm:w-max">
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Button>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <div>
            <MobileSidebar />
          </div>
          <Avatar size={40} name={userId as string} />
          {userId?.slice(0, 10)}
        </h1>
        <div className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-750 text-sm mb-3">
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
                <span className="text-neutral-100">Country:</span>
                <div className="text-neutral-300 flex gap-1 items-center">
                  <CountryFlag country={data?.country || ""} />
                  {data?.country ? getCountryName(data.country) : "N/A"}
                </div>
                <span className=" text-neutral-100">Region:</span>
                <div className="text-neutral-300">{data?.region ? getRegionName(data.region) : "N/A"}</div>
                <span className=" text-neutral-100">City:</span>
                <div className="text-neutral-300">{data?.city ?? "N/A"}</div>
                <span className=" text-neutral-100">Language:</span>
                <div className="text-neutral-300">{data?.language ? getLanguageName(data.language) : "N/A"}</div>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className=" text-neutral-100">Device Type:</span>
                <div className="text-neutral-300 flex gap-1 items-center">
                  {data?.device_type === "Desktop" && <Monitor className="w-4 h-4" />}
                  {data?.device_type === "Mobile" && <Smartphone className="w-4 h-4" />}
                  {data?.device_type === "Tablet" && <Tablet className="w-4 h-4" />}
                  {data?.device_type}
                </div>
                <span className=" text-neutral-100">Browser:</span>
                <div className="flex gap-1 text-neutral-300 items-center">
                  <Browser browser={data?.browser || "Unknown"} />
                  {data?.browser}
                  {data?.browser_version && <span className="ml-1">v{data?.browser_version}</span>}
                </div>
                <span className="text-neutral-100">OS:</span>
                <div className="flex gap-1 text-neutral-300 items-center">
                  <OperatingSystem os={data?.operating_system || ""} />
                  {data?.operating_system}
                  {data?.operating_system_version && <span className="ml-1">v{data?.operating_system_version}</span>}
                </div>
                <span className="text-neutral-100">Screen Size:</span>
                <div className="flex gap-1 text-neutral-300">
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
                  className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-750 flex-grow"
                >
                  <div className="text-xs text-neutral-400 flex items-center gap-1">
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
              <div className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-750 flex-grow">
                <div className="text-xs text-neutral-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Avg. Session Duration
                </div>
                <div className="font-semibold">{data?.duration ? formatDuration(data.duration) : "N/A"}</div>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-400 flex items-center gap-1">
                  <Files className="w-4 h-4" />
                  Sessions
                </div>
                <div className="font-semibold">{data?.sessions}</div>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-400 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Pageviews
                </div>
                <div className="font-semibold">{data?.pageviews}</div>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-400 flex items-center gap-1">
                  <MousePointerClick className="w-4 h-4" />
                  Events
                </div>
                <div className="font-semibold">{data?.events}</div>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-400 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  First Seen
                </div>
                <div className="font-semibold">
                  {DateTime.fromSQL(data?.first_seen ?? "", { zone: "utc" })
                    .toLocal()
                    .toLocaleString(DateTime.DATETIME_SHORT)}
                </div>
              </div>
              <div className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-800  flex-grow">
                <div className="text-xs text-neutral-400 flex items-center gap-1">
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
      <div className="bg-neutral-900 p-3 rounded-lg flex flex-col gap-1 border border-neutral-800 h-[150px]">
        <VisitCalendar sessionCount={sessionCount?.data ?? []} />
      </div>

      <h2 className="text-lg font-bold mb-4">Sessions</h2>
      <SessionsList userId={userId as string} />
    </div>
  );
}
