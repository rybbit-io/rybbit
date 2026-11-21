"use client";

import { Files, IdCard, Radio, Repeat, User, UserPlus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useGetLiveUserCount } from "@/api/analytics/hooks/useGetLiveUserCount";
import { useGetUsersSummary } from "@/api/analytics/hooks/useGetUsers";
import { StatBand } from "@/components/site/StatBand";
import { percentDelta } from "@/lib/delta";

const LIVE_MINUTES = 5;
const NO_VALUE = "–";

const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

const formatShare = (value: number) =>
  value.toLocaleString(undefined, { style: "percent", maximumFractionDigits: value < 0.1 ? 1 : 0 });

const perUser = (sessions: number | undefined, users: number | undefined) =>
  sessions !== undefined && users ? sessions / users : undefined;

/** The page's summary: who was here in the period, and how that compares with the period before. */
export function UsersStatBand({ comparisonEnabled }: { comparisonEnabled: boolean }) {
  const t = useExtracted();
  const { data: current, isError } = useGetUsersSummary();
  const { data: previousData } = useGetUsersSummary({ periodTime: "previous", enabled: comparisonEnabled });
  // A result kept from before the comparison was switched off is not a comparison any more.
  const previous = comparisonEnabled ? previousData : undefined;
  const { data: live, isError: isLiveError } = useGetLiveUserCount(LIVE_MINUTES);
  // Nothing in hand yet, including while the query waits for the site to resolve: a skeleton, not a zero.
  const isLoading = current === undefined && !isError;

  const count = (value: number | null | undefined) => (value == null ? NO_VALUE : value.toLocaleString());
  // A line of context only describes figures that arrived; it still holds its space while they load or fail.
  // `hint` spells the line out on hover, for the widths where the band has to cut it short.
  const context = (text: string, hint?: string) => (current ? <span title={hint}>{text}</span> : "");
  const newHint = t("Users with no visit in the {days} days before this period", {
    days: String(current?.lookback_days ?? 0),
  });
  const returningHint = t("Users who also visited in the {days} days before this period", {
    days: String(current?.lookback_days ?? 0),
  });
  const users = current?.users ?? 0;
  const days = current?.lookback_days ?? 0;

  const sessionsPerUser = perUser(current?.sessions, current?.users);
  const identifiedSessionsPerUser = perUser(current?.identified_sessions, current?.identified_users);

  return (
    <StatBand
      isLoading={isLoading}
      cells={[
        {
          id: "users",
          icon: <User className="h-3 w-3" />,
          label: t("Users"),
          value: count(current?.users),
          delta: percentDelta(current?.users, previous?.users),
          sub: context(
            previous
              ? t("{count} prev. period", { count: previous.users.toLocaleString() })
              : t("active in this period")
          ),
        },
        {
          id: "identified",
          icon: <IdCard className="h-3 w-3" />,
          label: t("Identified"),
          value: count(current?.identified_users),
          delta: percentDelta(current?.identified_users, previous?.identified_users),
          sub: context(t("{percent} of users", { percent: formatShare(share(current?.identified_users ?? 0, users)) })),
        },
        // An all-time period has no "before" to be new or returning against.
        current?.new_users !== null && {
          id: "new",
          icon: <UserPlus className="h-3 w-3" />,
          label: t("New"),
          value: count(current?.new_users),
          delta: percentDelta(current?.new_users, previous?.new_users),
          sub: context(
            t("{percent} · first visit in {days} days", {
              percent: formatShare(share(current?.new_users ?? 0, users)),
              days: String(days),
            }),
            newHint
          ),
          title: newHint,
        },
        current?.returning_users !== null && {
          id: "returning",
          icon: <Repeat className="h-3 w-3" />,
          label: t("Returning"),
          value: count(current?.returning_users),
          delta: percentDelta(current?.returning_users, previous?.returning_users),
          sub: context(
            t("{percent} · back within {days} days", {
              percent: formatShare(share(current?.returning_users ?? 0, users)),
              days: String(days),
            }),
            returningHint
          ),
          title: returningHint,
        },
        {
          id: "sessions-per-user",
          icon: <Files className="h-3 w-3" />,
          label: t("Sessions per user"),
          value: sessionsPerUser === undefined ? NO_VALUE : sessionsPerUser.toFixed(2),
          delta: percentDelta(sessionsPerUser, perUser(previous?.sessions, previous?.users)),
          sub: context(
            identifiedSessionsPerUser === undefined
              ? t("no identified users")
              : t("{value} when identified", { value: identifiedSessionsPerUser.toFixed(2) })
          ),
        },
        {
          id: "active-now",
          icon: <Radio className="h-3 w-3" />,
          label: t("Active now"),
          value: count(live?.count),
          sub: t("seen in the last {minutes} minutes", { minutes: String(LIVE_MINUTES) }),
          isLoading: live === undefined && !isLiveError,
        },
      ]}
    />
  );
}
