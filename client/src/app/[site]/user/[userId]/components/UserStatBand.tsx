"use client";

import { Calendar, CalendarCheck, Clock, Files } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { UserInfo } from "../../../../../api/analytics/endpoints";
import { EventIcon, PageviewIcon } from "../../../../../components/EventIcons";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { formatDuration } from "../../../../../lib/dateTimeUtils";
import { getTimezone } from "../../../../../lib/store";
import { formatter } from "../../../../../lib/utils";

function StatCell({
  icon,
  label,
  value,
  title,
  isLoading,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  title?: string;
  isLoading: boolean;
}) {
  return (
    <div className="min-w-0 bg-white px-3.5 py-2.5 dark:bg-neutral-900">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="mt-1.5 h-4 w-16 rounded" />
      ) : (
        <div
          className="mt-0.5 truncate text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-50"
          title={title}
        >
          {value}
        </div>
      )}
    </div>
  );
}

// Full-width engagement summary: one flat strip of six cells separated by
// hairline seams (gap-px over the border color), wrapping 6 → 3 → 2 per row.
export function UserStatBand({ data, isLoading }: { data: UserInfo | undefined; isLoading: boolean }) {
  const t = useExtracted();
  const { formatRelative, formatDateTime, hour12 } = useDateTimeFormat();

  const timezone = getTimezone();
  const toLocal = (sql: string | undefined) => {
    if (!sql) return null;
    const dt = DateTime.fromSQL(sql, { zone: "utc" }).setZone(timezone);
    // Empty ranges come back as epoch-zero timestamps; treat them as absent
    return dt.isValid && dt.year > 1970 ? dt : null;
  };
  const firstSeen = toLocal(data?.first_seen);
  const lastSeen = toLocal(data?.last_seen);
  const absolute = (dt: DateTime) =>
    formatDateTime(dt, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12,
      timeZone: timezone,
    });

  const count = (value: number | undefined) => (value != null ? formatter(value) : "—");
  const countTitle = (value: number | undefined) => (value != null ? value.toLocaleString() : undefined);

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-neutral-100 dark:border-neutral-850">
      <div className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-neutral-850 sm:grid-cols-3 lg:grid-cols-6">
        <StatCell
          icon={<Files className="h-3 w-3" />}
          label={t("Sessions")}
          value={count(data?.sessions)}
          title={countTitle(data?.sessions)}
          isLoading={isLoading}
        />
        <StatCell
          icon={<PageviewIcon className="h-3 w-3" />}
          label={t("Pageviews")}
          value={count(data?.pageviews)}
          title={countTitle(data?.pageviews)}
          isLoading={isLoading}
        />
        <StatCell
          icon={<EventIcon className="h-3 w-3" />}
          label={t("Events")}
          value={count(data?.events)}
          title={countTitle(data?.events)}
          isLoading={isLoading}
        />
        <StatCell
          icon={<Clock className="h-3 w-3" />}
          label={t("Avg Duration")}
          value={data?.duration ? formatDuration(data.duration) : "—"}
          isLoading={isLoading}
        />
        <StatCell
          icon={<Calendar className="h-3 w-3" />}
          label={t("First Seen")}
          value={firstSeen ? formatRelative(firstSeen) : "—"}
          title={firstSeen ? absolute(firstSeen) : undefined}
          isLoading={isLoading}
        />
        <StatCell
          icon={<CalendarCheck className="h-3 w-3" />}
          label={t("Last Seen")}
          value={lastSeen ? formatRelative(lastSeen) : "—"}
          title={lastSeen ? absolute(lastSeen) : undefined}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
