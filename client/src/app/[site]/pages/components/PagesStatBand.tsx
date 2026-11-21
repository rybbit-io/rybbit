"use client";

import { Clock, Eye, Files, Layers, LogOut } from "lucide-react";
import { useExtracted } from "next-intl";
import { useGetPagesSummary } from "@/api/analytics/hooks/useGetPages";
import { StatBand } from "@/components/site/StatBand";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { percentDelta, pointDelta } from "@/lib/delta";
import { useComparisonEnabled } from "@/lib/store";
import { formatter } from "@/lib/utils";

const EMPTY = "—";

export function PagesStatBand() {
  const t = useExtracted();
  const comparing = useComparisonEnabled();
  const { data: current, isLoading } = useGetPagesSummary();
  const { data: previousSummary } = useGetPagesSummary({ periodTime: "previous" });
  // With the comparison off the query is idle but can still hold its last answer.
  const previous = comparing ? previousSummary : undefined;

  // The comparison line under a value: reserved (empty) while it loads, absent when comparison is off.
  const previousLine = (value: string | undefined) =>
    comparing ? (value === undefined ? "" : t("{value} previous period", { value })) : undefined;
  const fixed = (value: number | null | undefined) => (value == null ? undefined : value.toFixed(2));

  return (
    <StatBand
      isLoading={isLoading || !current}
      cells={[
        {
          id: "pageviews",
          icon: <Eye className="h-3 w-3" />,
          label: t("Pageviews"),
          value: current ? formatter(current.pageviews) : EMPTY,
          title: current?.pageviews.toLocaleString(),
          delta: percentDelta(current?.pageviews, previous?.pageviews),
          sub: previousLine(previous ? formatter(previous.pageviews) : undefined),
        },
        {
          id: "pages",
          icon: <Files className="h-3 w-3" />,
          label: t("Pages with traffic"),
          value: current ? current.pages.toLocaleString() : EMPTY,
          delta: percentDelta(current?.pages, previous?.pages),
          sub: previousLine(previous?.pages.toLocaleString()),
        },
        {
          id: "views-per-session",
          icon: <Layers className="h-3 w-3" />,
          label: t("Views per session"),
          value: fixed(current?.views_per_session) ?? EMPTY,
          delta: percentDelta(current?.views_per_session, previous?.views_per_session),
          // A comparison period with no sessions has no ratio to print.
          sub: previousLine(fixed(previous?.views_per_session)),
        },
        {
          id: "time-on-page",
          icon: <Clock className="h-3 w-3" />,
          label: t("Avg time on page"),
          value: current?.time_on_page_seconds != null ? formatShortDuration(current.time_on_page_seconds) : EMPTY,
          delta: percentDelta(current?.time_on_page_seconds, previous?.time_on_page_seconds),
          sub: t("Exit views excluded"),
        },
        {
          id: "bounce-rate",
          icon: <LogOut className="h-3 w-3" />,
          label: t("Entry bounce rate"),
          value: current?.bounce_rate != null ? `${current.bounce_rate.toFixed(1)}%` : EMPTY,
          delta: pointDelta(current?.bounce_rate, previous?.bounce_rate),
          upIsGood: false,
          sub: current
            ? t("{bounced} of {sessions} sessions", {
                bounced: formatter(current.bounced_sessions),
                sessions: formatter(current.sessions),
              })
            : "",
        },
      ]}
    />
  );
}
