"use client";

import { useDebounce } from "@uidotdev/usehooks";
import { useExtracted } from "next-intl";
import { useMemo } from "react";
import { GoalDefinition } from "@/api/analytics/endpoints";
import { useGetGoalPreview } from "@/api/analytics/hooks/goals/useGetGoalPreview";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRate } from "../utils/goalLedger";
import { GoalTrendBars } from "./GoalTrendBars";

const DEBOUNCE_MS = 500;

/**
 * How many sessions the goal being typed would have counted in the selected
 * period. Goals are evaluated at query time over events that already exist,
 * so this is the number the goal shows once it is saved.
 *
 * `definition` is null while the form is incomplete.
 */
export function GoalMatchPreview({ definition }: { definition: GoalDefinition | null }) {
  const t = useExtracted();

  // Debounced as text: a definition object is new on every render, and a
  // debounce keyed on identity would never settle.
  const serialized = definition ? JSON.stringify(definition) : "";
  const settled = useDebounce(serialized, DEBOUNCE_MS);
  const settledDefinition = useMemo<GoalDefinition | null>(() => (settled ? JSON.parse(settled) : null), [settled]);

  const { data, isError } = useGetGoalPreview(settledDefinition);
  // Still typing, or the request for what was typed is in flight.
  const isPending = serialized !== settled || (settledDefinition !== null && !data && !isError);

  if (!definition) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t("Say what the goal matches to see how many sessions would have converted in the selected period.")}
      </p>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center gap-3" aria-busy="true">
        <Skeleton className="h-[22px] w-[120px] shrink-0 rounded" />
        <Skeleton className="h-3 w-64 max-w-full rounded" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t("The preview could not be loaded. The goal can still be saved.")}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <GoalTrendBars
        data={data.series}
        isLoading={false}
        label={t("Sessions that would have converted, over the selected period")}
        className="h-[22px] w-[120px] shrink-0"
      />
      <p className="min-w-0 text-neutral-700 dark:text-neutral-200">
        {data.conversions === 0
          ? t("No sessions would have converted in the selected period.")
          : t(
              "{count, plural, one {# session} other {# sessions}} would have converted in the selected period ({rate}).",
              { count: data.conversions, rate: formatRate(data.conversion_rate) }
            )}{" "}
        <span className="text-neutral-500 dark:text-neutral-400">
          {t("History is counted from events you already have.")}
        </span>
      </p>
    </div>
  );
}
