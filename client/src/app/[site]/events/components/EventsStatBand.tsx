"use client";

import { MousePointerClick, Rewind, SquareMousePointer, Tag, User } from "lucide-react";
import { useExtracted } from "next-intl";

import { useGetEventsOverview } from "@/api/analytics/hooks/events/useGetEventsOverview";
import { StatBand } from "@/components/site/StatBand";
import { NO_DELTA_TEXT, percentDelta } from "@/lib/delta";
import { useComparisonEnabled } from "@/lib/store";
import { formatter } from "@/lib/utils";

const ratio = (numerator: number | undefined, denominator: number | undefined) =>
  numerator !== undefined && denominator ? numerator / denominator : undefined;

interface EventsStatBandProps {
  /** Event names seen in this period but not in the comparison period. Undefined while unknown or with no comparison. */
  newEventNames?: number;
}

export function EventsStatBand({ newEventNames }: EventsStatBandProps) {
  const t = useExtracted();
  const comparisonEnabled = useComparisonEnabled();
  // Pending, not loading: the query waits for the site, and a band of blanks is not an answer.
  const { data: current, isPending } = useGetEventsOverview();
  const { data: previousData } = useGetEventsOverview({ periodTime: "previous" });
  // A disabled query keeps its last result, so the switch is read here.
  const previous = comparisonEnabled ? previousData : undefined;

  const perSession = ratio(current?.events, current?.sessions);
  const previousPerSession = ratio(previous?.events, previous?.sessions);
  const perActiveSession = ratio(current?.events, current?.sessions_with_events);
  const userShare = ratio(current?.users_with_events, current?.users);

  // A dash when the request failed: there is no number to show.
  const count = (value: number | undefined) => (value === undefined ? NO_DELTA_TEXT : formatter(value));
  const exact = (value: number | undefined) => value?.toLocaleString();

  return (
    <StatBand
      isLoading={isPending}
      cells={[
        {
          id: "events",
          icon: <MousePointerClick className="h-3 w-3" />,
          label: t("Events"),
          value: count(current?.events),
          title: exact(current?.events),
          delta: percentDelta(current?.events, previous?.events),
          sub: t("Custom events"),
        },
        {
          id: "users",
          icon: <User className="h-3 w-3" />,
          label: t("Users with an event"),
          value: count(current?.users_with_events),
          title: exact(current?.users_with_events),
          delta: percentDelta(current?.users_with_events, previous?.users_with_events),
          sub: userShare === undefined ? "" : t("{share}% of users", { share: (userShare * 100).toFixed(1) }),
        },
        {
          id: "per-session",
          icon: <Rewind className="h-3 w-3" />,
          label: t("Events per session"),
          value: current ? (perSession ?? 0).toFixed(2) : NO_DELTA_TEXT,
          delta: percentDelta(perSession, previousPerSession),
          sub:
            perActiveSession === undefined
              ? ""
              : t("{count} in sessions with events", { count: perActiveSession.toFixed(2) }),
        },
        {
          id: "names",
          icon: <Tag className="h-3 w-3" />,
          label: t("Event names"),
          value: count(current?.event_names),
          title: exact(current?.event_names),
          sub:
            newEventNames === undefined
              ? ""
              : t("{count} new vs comparison", { count: newEventNames.toLocaleString() }),
        },
        {
          id: "autocaptured",
          icon: <SquareMousePointer className="h-3 w-3" />,
          label: t("Autocaptured"),
          value: count(current?.autocaptured),
          title: exact(current?.autocaptured),
          delta: percentDelta(current?.autocaptured, previous?.autocaptured),
          sub: t("Clicks, links, forms, copies, inputs"),
        },
      ]}
    />
  );
}
