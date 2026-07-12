"use client";

import { Calendar, CalendarCheck, Clock, Files } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted, useLocale } from "next-intl";
import { ReactNode } from "react";

import { UserInfo } from "@/api/analytics/endpoints";
import { Avatar } from "@/components/Avatar";
import { CopyText } from "@/components/CopyText";
import { EventIcon, PageviewIcon } from "@/components/EventIcons";
import { IdentifiedBadge } from "@/components/IdentifiedBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/dateTimeUtils";
import { getTimezone } from "@/lib/store";

import { UserActions } from "./UserActions";

interface UserSummaryProps {
  data: UserInfo | undefined;
  displayName: string;
  isLoading: boolean;
  userId: string;
  showActions: boolean;
}

function SummaryMetric({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  isLoading: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
        <span className="text-neutral-500 dark:text-neutral-500" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-5 w-20 motion-reduce:animate-none" />
      ) : (
        <div
          className="truncate text-base font-semibold tabular-nums text-neutral-950 dark:text-neutral-50"
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </div>
      )}
    </div>
  );
}

export function UserSummary({ data, displayName, isLoading, userId, showActions }: UserSummaryProps) {
  const t = useExtracted();
  const locale = useLocale();
  const formatter = new Intl.NumberFormat(locale);

  const isIdentified = !!data?.identified_user_id;
  const traitsEmail = typeof data?.traits?.email === "string" ? data.traits.email : undefined;
  const lastActiveTime = data?.last_seen ? DateTime.fromSQL(data.last_seen, { zone: "utc" }) : undefined;

  const localTime = data?.timezone ? DateTime.now().setZone(data.timezone).setLocale(locale) : null;
  const localTimeValid = localTime?.isValid ? localTime : null;
  const timezoneCity = data?.timezone?.split("/").pop()?.replace(/_/g, " ");

  const formatDate = (value: string | undefined) => {
    if (!value) return "—";
    const date = DateTime.fromSQL(value, { zone: "utc" }).setZone(getTimezone()).setLocale(locale);
    return date.isValid ? date.toLocaleString(DateTime.DATE_MED) : "—";
  };

  return (
    <Card aria-labelledby="user-profile-title">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start md:p-5">
        <div className="shrink-0 rounded-full ring-1 ring-neutral-150 ring-offset-2 ring-offset-white dark:ring-neutral-750 dark:ring-offset-neutral-900">
          <Avatar size={56} id={userId} lastActiveTime={lastActiveTime} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1
              id="user-profile-title"
              className="min-w-0 truncate text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50"
            >
              {isLoading ? (
                <Skeleton className="h-7 w-40 motion-reduce:animate-none" aria-label={t("Loading user profile")} />
              ) : (
                displayName
              )}
            </h1>
            {!isLoading &&
              (isIdentified ? (
                <IdentifiedBadge showLabel traits={data?.traits} userId={data?.identified_user_id} />
              ) : (
                <Badge variant="outline">{t("Anonymous")}</Badge>
              ))}
          </div>

          {isLoading ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-4 w-48 motion-reduce:animate-none" />
              <Skeleton className="h-3 w-64 max-w-full motion-reduce:animate-none" />
            </div>
          ) : (
            <div className="mt-1.5 min-w-0 space-y-1">
              {traitsEmail && (
                <p className="truncate text-sm text-neutral-700 dark:text-neutral-300" title={traitsEmail}>
                  {traitsEmail}
                </p>
              )}
              <CopyText
                text={userId}
                maxLength={56}
                tooltipText={t("Copy user ID")}
                className="min-w-0 text-neutral-600 dark:text-neutral-400"
                copyButtonClassName="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <span className="truncate text-xs">{userId}</span>
              </CopyText>
            </div>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {localTimeValid && (
            <Badge
              variant="outline"
              className="h-7 gap-1.5 whitespace-nowrap px-2 font-normal"
              title={`${t("Local time")} · ${data?.timezone}`}
            >
              <Clock className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
              <span className="font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
                {localTimeValid.toLocaleString(DateTime.TIME_SIMPLE)}
              </span>
              {timezoneCity && <span className="text-neutral-600 dark:text-neutral-400">{timezoneCity}</span>}
            </Badge>
          )}
          {showActions && data && <UserActions userId={userId} data={data} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-neutral-100 bg-neutral-50/60 p-4 sm:grid-cols-3 xl:grid-cols-6 dark:border-neutral-850 dark:bg-neutral-950/30 md:px-5">
        <SummaryMetric
          icon={<Files className="h-3.5 w-3.5" />}
          label={t("Sessions")}
          value={data ? formatter.format(data.sessions) : "—"}
          isLoading={isLoading}
        />
        <SummaryMetric
          icon={<PageviewIcon className="h-3.5 w-3.5" />}
          label={t("Pageviews")}
          value={data ? formatter.format(data.pageviews) : "—"}
          isLoading={isLoading}
        />
        <SummaryMetric
          icon={<EventIcon className="h-3.5 w-3.5" />}
          label={t("Events")}
          value={data ? formatter.format(data.events) : "—"}
          isLoading={isLoading}
        />
        <SummaryMetric
          icon={<Clock className="h-3.5 w-3.5" />}
          label={t("Average duration")}
          value={data ? formatDuration(data.duration) : "—"}
          isLoading={isLoading}
        />
        <SummaryMetric
          icon={<Calendar className="h-3.5 w-3.5" />}
          label={t("First seen")}
          value={formatDate(data?.first_seen)}
          isLoading={isLoading}
        />
        <SummaryMetric
          icon={<CalendarCheck className="h-3.5 w-3.5" />}
          label={t("Last seen")}
          value={formatDate(data?.last_seen)}
          isLoading={isLoading}
        />
      </div>
    </Card>
  );
}
