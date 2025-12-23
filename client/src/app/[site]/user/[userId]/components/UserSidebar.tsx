"use client";

import { getTimezone } from "@/lib/store";
import { Calendar, CalendarCheck, Clock, Files, Globe, Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import { DateTime } from "luxon";
import { Avatar, generateName } from "../../../../../components/Avatar";
import { Badge } from "../../../../../components/ui/badge";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { IdentifiedBadge } from "../../../../../components/IdentifiedBadge";
import { formatDuration } from "../../../../../lib/dateTimeUtils";
import { getCountryName, getLanguageName } from "../../../../../lib/utils";
import { Browser } from "../../../components/shared/icons/Browser";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { VisitCalendar } from "./Calendar";
import { EventIcon, PageviewIcon } from "../../../../../components/EventIcons";
import { UserInfo, UserSessionCountResponse } from "../../../../../api/analytics/endpoints";

interface UserSidebarProps {
  data: UserInfo | undefined;
  isLoading: boolean;
  sessionCount: UserSessionCountResponse[];
  getRegionName: (region: string) => string;
}

// Reusable card wrapper for sidebar sections
function SidebarCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-850 p-4 ${className}`}
    >
      {children}
    </div>
  );
}

// Info row component for consistent styling
function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850 last:border-0 text-xs">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </div>
  );
}

// Stat card component
function StatCard({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 uppercase tracking-wide">
          <Skeleton className="w-3 h-3 rounded" />
          <Skeleton className="h-2.5 w-14 rounded" />
        </div>
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function UserSidebar({ data, isLoading, sessionCount, getRegionName }: UserSidebarProps) {
  const isIdentified = !!data?.identified_user_id;

  // Filter custom traits (exclude username, name, email)
  const customTraits = data?.traits
    ? Object.entries(data.traits).filter(([key]) => !["username", "name", "email"].includes(key))
    : [];

  return (
    <div className="w-full lg:w-[300px] md:shrink-0 space-y-3">
      {/* Stats Grid */}
      <SidebarCard>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Files className="w-3 h-3" />}
            label="Sessions"
            value={data?.sessions ?? "—"}
            isLoading={isLoading}
          />
          <StatCard
            icon={<PageviewIcon className="w-3 h-3" />}
            label="Pageviews"
            value={data?.pageviews ?? "—"}
            isLoading={isLoading}
          />
          <StatCard
            icon={<EventIcon className="w-3 h-3" />}
            label="Events"
            value={data?.events ?? "—"}
            isLoading={isLoading}
          />
          <StatCard
            icon={<Clock className="w-3 h-3" />}
            label="Avg Duration"
            value={data?.duration ? formatDuration(data.duration) : "—"}
            isLoading={isLoading}
          />
          <StatCard
            icon={<Calendar className="w-3 h-3" />}
            label="First Seen"
            value={
              data?.first_seen
                ? DateTime.fromSQL(data.first_seen, { zone: "utc" }).setZone(getTimezone()).toLocaleString(DateTime.DATE_MED)
                : "—"
            }
            isLoading={isLoading}
          />
          <StatCard
            icon={<CalendarCheck className="w-3 h-3" />}
            label="Last Seen"
            value={
              data?.last_seen
                ? DateTime.fromSQL(data.last_seen, { zone: "utc" }).setZone(getTimezone()).toLocaleString(DateTime.DATE_MED)
                : "—"
            }
            isLoading={isLoading}
          />
        </div>
      </SidebarCard>

      {/* Location & Device Info */}
      <SidebarCard>
        <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
          Location & Device
        </h3>
        {isLoading ? (
          <div className="space-y-0">
            {/* Country */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850">
              <Skeleton className="h-3 w-14 rounded" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
            {/* Region */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
            {/* Language */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            {/* Device */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850">
              <Skeleton className="h-3 w-12 rounded" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
            </div>
            {/* Browser */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850">
              <Skeleton className="h-3 w-14 rounded" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
            {/* OS */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-neutral-850">
              <Skeleton className="h-3 w-8 rounded" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
            {/* Screen */}
            <div className="flex items-center justify-between py-1.5">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        ) : (
          <div>
            <InfoRow
              icon={<CountryFlag country={data?.country || ""} className="w-4 h-4" />}
              label="Country"
              value={data?.country ? getCountryName(data.country) : "—"}
            />
            <InfoRow
              label="Region"
              value={
                <span className="truncate max-w-[160px] inline-block">
                  {data?.region ? getRegionName(data.region) : "—"}
                  {data?.city && `, ${data.city}`}
                </span>
              }
            />
            <InfoRow label="Language" value={data?.language ? getLanguageName(data.language) : "—"} />
            <InfoRow
              icon={
                data?.device_type === "Desktop" ? (
                  <Monitor className="w-4 h-4" />
                ) : data?.device_type === "Mobile" ? (
                  <Smartphone className="w-4 h-4" />
                ) : data?.device_type === "Tablet" ? (
                  <Tablet className="w-4 h-4" />
                ) : null
              }
              label="Device"
              value={data?.device_type ?? "—"}
            />
            <InfoRow
              icon={<Browser browser={data?.browser || "Unknown"} size={13} />}
              label="Browser"
              value={data?.browser ? `${data.browser}${data.browser_version ? ` v${data.browser_version}` : ""}` : "—"}
            />
            <InfoRow
              icon={<OperatingSystem os={data?.operating_system || ""} size={13} />}
              label="OS"
              value={
                data?.operating_system
                  ? `${data.operating_system}${data.operating_system_version ? ` v${data.operating_system_version}` : ""}`
                  : "—"
              }
            />
            <InfoRow
              label="Screen"
              value={data?.screen_width && data?.screen_height ? `${data.screen_width}×${data.screen_height}` : "—"}
            />
          </div>
        )}
      </SidebarCard>

      {/* Activity Calendar */}
      <SidebarCard className="h-[180px]">
        <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
          Activity Calendar
        </h3>
        <div className="h-[140px]">
          <VisitCalendar sessionCount={sessionCount} />
        </div>
      </SidebarCard>

      {/* User Traits (identified users only) */}
      {isIdentified && customTraits.length > 0 && (
        <SidebarCard>
          <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            User Traits
          </h3>
          <div className="space-y-1">
            {customTraits.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between py-1 border-b border-neutral-50 dark:border-neutral-850 last:border-0 text-xs"
              >
                <span className="text-neutral-500 dark:text-neutral-400 capitalize">{key.replace(/_/g, " ")}</span>
                <span className="text-neutral-700 dark:text-neutral-200 truncate max-w-[160px]">{String(value)}</span>
              </div>
            ))}
          </div>
        </SidebarCard>
      )}

      {/* Linked Devices (identified users only) */}
      {/* {isIdentified && data?.linked_devices && data.linked_devices.length > 0 && (
        <SidebarCard>
          <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Laptop className="w-3 h-3" />
            Linked Devices ({data.linked_devices.length})
          </h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data.linked_devices.map(device => (
              <div
                key={device.anonymous_id}
                className="flex items-center justify-between py-1 border-b border-neutral-50 dark:border-neutral-850 last:border-0"
              >
                <span className="text-neutral-600 dark:text-neutral-300 font-mono text-xs truncate max-w-[140px]">
                  {device.anonymous_id}
                </span>
                <span className="text-neutral-400 dark:text-neutral-500 text-xs">
                  {DateTime.fromISO(device.created_at).toRelative()}
                </span>
              </div>
            ))}
          </div>
        </SidebarCard>
      )} */}
    </div>
  );
}
