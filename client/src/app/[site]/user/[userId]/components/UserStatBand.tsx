"use client";

import { Calendar, CalendarCheck, Clock, Files } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { UserInfo } from "../../../../../api/analytics/endpoints";
import { EventTypeIcon } from "../../../../../components/EventIcons";
import { StatBand } from "../../../../../components/site/StatBand";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { formatDuration } from "../../../../../lib/dateTimeUtils";
import { getTimezone } from "../../../../../lib/store";
import { formatter } from "../../../../../lib/utils";

// Full-width engagement summary: six cells in the shared stat band, wrapping
// 6 → 3 → 2 per row.
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
    <StatBand
      className="mb-4"
      isLoading={isLoading}
      cells={[
        {
          icon: <Files className="h-3 w-3" />,
          label: t("Sessions"),
          value: count(data?.sessions),
          title: countTitle(data?.sessions),
        },
        {
          icon: <EventTypeIcon type="pageview" className="h-3 w-3" />,
          label: t("Pageviews"),
          value: count(data?.pageviews),
          title: countTitle(data?.pageviews),
        },
        {
          icon: <EventTypeIcon type="custom_event" className="h-3 w-3" />,
          label: t("Events"),
          value: count(data?.events),
          title: countTitle(data?.events),
        },
        {
          icon: <Clock className="h-3 w-3" />,
          label: t("Avg Duration"),
          value: data?.duration ? formatDuration(data.duration) : "—",
        },
        {
          icon: <Calendar className="h-3 w-3" />,
          label: t("First Seen"),
          value: firstSeen ? formatRelative(firstSeen) : "—",
          title: firstSeen ? absolute(firstSeen) : undefined,
        },
        {
          icon: <CalendarCheck className="h-3 w-3" />,
          label: t("Last Seen"),
          value: lastSeen ? formatRelative(lastSeen) : "—",
          title: lastSeen ? absolute(lastSeen) : undefined,
        },
      ]}
    />
  );
}
