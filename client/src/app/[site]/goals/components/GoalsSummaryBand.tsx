"use client";

import { CheckCheck, Rewind, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useExtracted } from "next-intl";
import { GoalsSummary } from "@/api/analytics/endpoints";
import { StatBand, StatBandCell } from "@/components/site/StatBand";
import { NO_DELTA_TEXT, percentDelta } from "@/lib/delta";
import { bestMover, formatRate, LedgerRow, slippingGoal } from "../utils/goalLedger";

const ICON = "h-3 w-3";

interface GoalsSummaryBandProps {
  summary?: GoalsSummary;
  /** The same summary for the comparison period; undefined while it is off or loading. */
  previous?: GoalsSummary;
  /** Every goal, joined with the comparison period. */
  rows: LedgerRow[];
  isLoading: boolean;
  comparisonEnabled: boolean;
  isLoadingComparison: boolean;
}

const sumConversions = (summary: GoalsSummary | undefined) =>
  summary ? summary.goals.reduce((sum, goal) => sum + goal.total_conversions, 0) : undefined;

/**
 * The page's opening numbers: how many sessions there were, how many of them
 * completed any goal, how many goal completions that makes, and (with a
 * comparison on) which goal gained the most and which lost the most rate.
 */
export function GoalsSummaryBand({
  summary,
  previous,
  rows,
  isLoading,
  comparisonEnabled,
  isLoadingComparison,
}: GoalsSummaryBandProps) {
  const t = useExtracted();

  const sessions = summary?.total_sessions ?? 0;
  const converting = summary?.converting_sessions ?? 0;
  const completions = sumConversions(summary) ?? 0;
  const goalCount = summary?.goals.length ?? 0;

  const mover = bestMover(rows);
  const slipping = slippingGoal(rows);

  const cells: (StatBandCell | false)[] = [
    {
      id: "sessions",
      icon: <Rewind className={ICON} />,
      label: t("Sessions"),
      value: sessions.toLocaleString(),
      delta: percentDelta(sessions, previous?.total_sessions),
      sub: t("The denominator of every rate"),
    },
    {
      id: "converting",
      icon: <Target className={ICON} />,
      label: t("Converting sessions"),
      value: converting.toLocaleString(),
      delta: percentDelta(converting, previous?.converting_sessions),
      sub: t("{rate} completed at least one goal", {
        rate: `${(sessions > 0 ? (converting / sessions) * 100 : 0).toFixed(1)}%`,
      }),
    },
    {
      id: "completions",
      icon: <CheckCheck className={ICON} />,
      label: t("Goal completions"),
      value: completions.toLocaleString(),
      delta: percentDelta(completions, sumConversions(previous)),
      sub: t("Across {count, plural, one {# goal} other {# goals}}", { count: goalCount }),
    },
    comparisonEnabled && {
      id: "best-mover",
      icon: <TrendingUp className={ICON} />,
      label: t("Best mover"),
      value: mover ? mover.label : NO_DELTA_TEXT,
      title: mover?.label,
      delta: mover?.conversionsDelta,
      sub: mover
        ? t("{count, plural, one {# conversion} other {# conversions}}", { count: mover.conversions })
        : t("No goal gained conversions"),
      isLoading: isLoading || isLoadingComparison,
    },
    comparisonEnabled && {
      id: "slipping",
      icon: <TrendingDown className={ICON} />,
      label: t("Slipping"),
      value: slipping ? slipping.label : NO_DELTA_TEXT,
      title: slipping?.label,
      delta: slipping?.rateDelta,
      sub:
        slipping && slipping.previousRate !== null
          ? t("Rate went from {from} to {to}", {
              from: formatRate(slipping.previousRate),
              to: formatRate(slipping.rate),
            })
          : t("No goal lost conversion rate"),
      isLoading: isLoading || isLoadingComparison,
    },
  ];

  return <StatBand cells={cells} isLoading={isLoading} />;
}
