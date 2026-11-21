"use client";

import { CalendarCheck, Clock, Files, Target } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { useUserGoals, useUserSummary } from "../../../../../api/analytics/hooks/useUserProfile";
import { describeComparisonWindow } from "../../../../../components/DateSelector/rangeFields";
import { EventTypeIcon } from "../../../../../components/EventIcons";
import { StatBand, StatBandProps } from "../../../../../components/site/StatBand";
import { formatShortDuration } from "../../../../../lib/dateTimeUtils";
import { percentDelta } from "../../../../../lib/delta";
import { useComparisonEnabled, useStore, useTimezone } from "../../../../../lib/store";
import { formatter } from "../../../../../lib/utils";
import { profileWindow, singleDayLabel } from "./profileWindow";

const OutOf = ({ children }: { children: ReactNode }) => (
  <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400"> {children}</span>
);

/**
 * The profile's summary strip: what this user did in the selected period,
 * each figure against the comparison period. Lifetime facts (first seen, last
 * seen) live in the rail, not here, so nothing in the band changes meaning
 * with the date range.
 */
export function UserStatBand({ userId }: { userId: string }) {
  const t = useExtracted();
  const zone = useTimezone();
  const time = useStore(state => state.time);
  const previousTime = useStore(state => state.previousTime);
  const comparisonEnabled = useComparisonEnabled();

  const { data: current, isLoading } = useUserSummary(userId);
  const { data: previousSummary, isLoading: isLoadingPrevious } = useUserSummary(userId, "previous");
  // Turning the comparison off disables the query, but a disabled query still
  // hands back its last result as a placeholder: drop it here so the deltas go.
  const previous = comparisonEnabled ? previousSummary : undefined;
  const { data: goals, isLoading: isLoadingGoals } = useUserGoals(userId);

  const comparisonWindow = singleDayLabel(describeComparisonWindow(previousTime, time, zone));
  const window = profileWindow(time, zone);

  const count = (value: number | undefined) => (value != null ? formatter(value) : "—");
  const exact = (value: number | undefined) => (value != null ? value.toLocaleString() : undefined);
  const duration = (seconds: number | undefined) => (seconds ? formatShortDuration(seconds) : "—");

  // One line under each figure: what it was in the comparison period. Passed
  // as "" while that is loading so the line's height is reserved, and left out
  // altogether when the comparison is off.
  const before = (value: string | undefined) => {
    if (!comparisonEnabled) return undefined;
    if (isLoadingPrevious || !previous || value === undefined) return "";
    return comparisonWindow
      ? t("{value} in {window}", { value, window: comparisonWindow })
      : t("{value} before", { value });
  };

  const completedGoals = goals?.filter(goal => goal.sessions > 0).length ?? 0;
  // A conversion is one session completing one goal, as on the Goals page.
  const conversions = goals?.reduce((total, goal) => total + goal.sessions, 0) ?? 0;
  // A site with no goals has nothing to put in the last cell.
  const showGoals = isLoadingGoals || (goals?.length ?? 0) > 0;

  const cells: StatBandProps["cells"] = [
    {
      id: "sessions",
      icon: <Files className="h-3 w-3" />,
      label: t("Sessions"),
      value: count(current?.sessions),
      title: exact(current?.sessions),
      delta: percentDelta(current?.sessions, previous?.sessions),
      sub: before(previous ? formatter(previous.sessions) : undefined),
    },
    {
      id: "pageviews",
      icon: <EventTypeIcon type="pageview" className="h-3 w-3" />,
      label: t("Pageviews"),
      value: count(current?.pageviews),
      title: exact(current?.pageviews),
      delta: percentDelta(current?.pageviews, previous?.pageviews),
      sub: before(previous ? formatter(previous.pageviews) : undefined),
    },
    {
      id: "events",
      icon: <EventTypeIcon type="custom_event" className="h-3 w-3" />,
      label: t("Events"),
      value: count(current?.events),
      title: exact(current?.events),
      delta: percentDelta(current?.events, previous?.events),
      sub: before(previous ? formatter(previous.events) : undefined),
    },
    {
      id: "duration",
      icon: <Clock className="h-3 w-3" />,
      label: t("Avg duration"),
      value: duration(current?.duration),
      // No sessions means no average: nothing to compare and nothing to
      // quote, rather than an average of zero.
      delta: current?.sessions ? percentDelta(current.duration, previous?.duration) : null,
      sub: before(previous && previous.sessions > 0 ? duration(previous.duration) : undefined),
    },
    {
      id: "active-days",
      icon: <CalendarCheck className="h-3 w-3" />,
      label: t("Active days"),
      value: (
        <>
          {count(current?.active_days)}
          {window && current && <OutOf>{t("of {total}", { total: window.days.toLocaleString() })}</OutOf>}
        </>
      ),
      title: t("Days on which this user started a session"),
      delta: percentDelta(current?.active_days, previous?.active_days),
      sub: before(previous ? formatter(previous.active_days) : undefined),
    },
    showGoals && {
      id: "goals",
      icon: <Target className="h-3 w-3" />,
      label: t("Goals completed"),
      value: (
        <>
          {completedGoals.toLocaleString()}
          <OutOf>{t("of {total}", { total: (goals?.length ?? 0).toLocaleString() })}</OutOf>
        </>
      ),
      title: t("Goals this user completed at least once in this period"),
      sub: t("{count, plural, one {# conversion} other {# conversions}}", { count: conversions }),
      isLoading: isLoadingGoals,
    },
  ];

  // One row of six needs about 160px a cell. The band's own breakpoints go by
  // the viewport, and between `lg` and `xl` the app sidebar leaves less than
  // that, which cut off the figures themselves. Below `xl` the band is rows
  // of three instead.
  return (
    <>
      <StatBand className="xl:hidden" isLoading={isLoading} columns={3} cells={cells} />
      <StatBand className="hidden xl:block" isLoading={isLoading} columns={showGoals ? 6 : 5} cells={cells} />
    </>
  );
}
