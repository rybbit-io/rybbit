"use client";

import { CircleCheck, Target } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { UserGoal } from "../../../../../api/analytics/endpoints/userProfile";
import { useUserGoals } from "../../../../../api/analytics/hooks/useUserProfile";
import { ErrorState } from "../../../../../components/ErrorState";
import { Card } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { useTimezone } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import { OpenInLink, ProfileCardHeader } from "./ProfileCard";
import { useProfileHref, userFilter } from "./profileLinks";
import { relativeDay } from "./sessionGroups";

/** Completed in the period first, most sessions on top; the rest keep the server's order. */
export const sortUserGoals = (goals: UserGoal[]) =>
  [...goals].sort(
    (a, b) =>
      b.sessions - a.sessions || (b.last_completed ?? "").localeCompare(a.last_completed ?? "") || a.goalId - b.goalId
  );

/**
 * The site's goals as this user met them in the selected period: how many
 * sessions completed each one and when the last completion was.
 */
export function UserGoals({ userId }: { userId: string }) {
  const t = useExtracted();
  const zone = useTimezone();
  const profileHref = useProfileHref();
  const { formatDateTime } = useDateTimeFormat();
  const { data, isLoading, error, refetch } = useUserGoals(userId);

  const goals = sortUserGoals(data ?? []);
  const now = DateTime.now().setZone(zone);

  const lastCompleted = (goal: UserGoal) => {
    if (!goal.last_completed) return null;
    const at = DateTime.fromSQL(goal.last_completed, { zone: "utc" }).setZone(zone);
    if (!at.isValid) return null;
    const named = relativeDay(at.toISODate() ?? "", now);
    return {
      label:
        named === "today"
          ? t("Today")
          : named === "yesterday"
            ? t("Yesterday")
            : formatDateTime(at, {
                month: "short",
                day: "numeric",
                year: at.year === now.year ? undefined : "numeric",
                timeZone: zone,
              }),
      title: formatDateTime(at, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: zone,
      }),
    };
  };

  return (
    <Card>
      <div className="p-4">
        <ProfileCardHeader
          title={t("Goals")}
          right={<OpenInLink href={profileHref("goals", [userFilter(userId)])}>{t("Open in Goals")}</OpenInLink>}
        />

        {isLoading ? (
          <div className="mt-3 space-y-3" aria-hidden>
            {[0, 1, 2, 3, 4].map(row => (
              <div key={row} className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 flex-1 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState title={t("Failed to load data")} message={error.message} refetch={refetch} />
        ) : goals.length === 0 ? (
          <div className="flex min-h-[140px] flex-col items-center justify-center gap-1 py-4 text-center">
            <Target className="mb-1 h-5 w-5 text-neutral-400 dark:text-neutral-500" />
            <p className="text-sm text-neutral-700 dark:text-neutral-200">{t("No goals on this site yet")}</p>
            <p className="max-w-[260px] text-xs text-neutral-500 dark:text-neutral-400">
              {t("Create a goal to see which ones this user completes.")}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="flex-1">{t("Goal")}</span>
              <span className="w-14 text-right">{t("Sessions")}</span>
              <span className="w-[72px] text-right">{t("Last")}</span>
            </div>
            <ul className="mt-0.5 max-h-[224px] overflow-y-auto">
              {goals.map(goal => {
                const completed = goal.sessions > 0;
                const last = lastCompleted(goal);
                return (
                  <li
                    key={goal.goalId}
                    className="flex h-8 items-center gap-2 border-b border-neutral-50 text-xs last:border-0 dark:border-neutral-850"
                  >
                    <CircleCheck
                      aria-hidden="true"
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        completed ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-300 dark:text-neutral-600"
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px]",
                        completed ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500 dark:text-neutral-400"
                      )}
                      title={goal.name ?? undefined}
                    >
                      {goal.name || t("Goal #{goalId}", { goalId: String(goal.goalId) })}
                      {!completed && <span className="sr-only"> ({t("not completed in this period")})</span>}
                    </span>
                    <span
                      className={cn(
                        "w-14 text-right tabular-nums",
                        completed ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-400 dark:text-neutral-500"
                      )}
                    >
                      {completed ? `${goal.sessions.toLocaleString()}×` : "–"}
                    </span>
                    <span
                      className="w-[72px] truncate text-right tabular-nums text-neutral-500 dark:text-neutral-400"
                      title={last?.title}
                    >
                      {last?.label ?? "–"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
