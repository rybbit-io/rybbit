"use client";

import { Clock, Files, LogOut, Rewind, Target, TriangleAlert } from "lucide-react";
import { useExtracted } from "next-intl";
import { SessionsSummary } from "@/api/analytics/endpoints";
import { StatBand } from "@/components/site/StatBand";
import { formatShortDuration } from "@/lib/dateTimeUtils";
import { percentDelta, pointDelta } from "@/lib/delta";
import { useComparisonEnabled } from "@/lib/store";
import { formatter } from "@/lib/utils";

// A count as a percentage of the period's sessions; undefined when there is no count to show.
const share = (count: number | null | undefined, sessions: number | undefined) => {
  if (count == null || sessions === undefined) return undefined;
  return sessions > 0 ? (count / sessions) * 100 : 0;
};

const percent = (value: number | undefined) => (value === undefined ? "" : `${value.toFixed(1)}%`);

interface SessionsStatBandProps {
  summary: SessionsSummary | undefined;
  /** The comparison period's summary; undefined while it loads or when the comparison is off. */
  previous: SessionsSummary | undefined;
  isLoading: boolean;
}

/**
 * The period at a glance. These figures describe every session the filters
 * allow; the ranges and the saved views narrow the ledger below, not the band.
 */
export function SessionsStatBand({ summary, previous, isLoading }: SessionsStatBandProps) {
  const t = useExtracted();
  const comparisonEnabled = useComparisonEnabled();

  // With the comparison on, the line is reserved while the previous period loads.
  const previousLine = (format: (period: SessionsSummary) => string) =>
    comparisonEnabled ? (previous ? t("{value} prev.", { value: format(previous) }) : "") : undefined;

  const convertedShare = share(summary?.converted, summary?.sessions);
  const errorShare = share(summary?.with_errors, summary?.sessions);

  return (
    <StatBand
      isLoading={isLoading || !summary}
      cells={[
        {
          id: "sessions",
          icon: <Rewind className="h-3 w-3" />,
          label: t("Sessions"),
          value: formatter(summary?.sessions ?? 0),
          title: summary?.sessions.toLocaleString(),
          delta: percentDelta(summary?.sessions, previous?.sessions),
          sub: previousLine(period => formatter(period.sessions)),
        },
        {
          id: "duration",
          icon: <Clock className="h-3 w-3" />,
          label: t("Avg duration"),
          value: formatShortDuration(summary?.session_duration ?? 0),
          delta: percentDelta(summary?.session_duration, previous?.session_duration),
          sub: previousLine(period => formatShortDuration(period.session_duration)),
        },
        {
          id: "pages",
          icon: <Files className="h-3 w-3" />,
          label: t("Pages per session"),
          value: (summary?.pages_per_session ?? 0).toFixed(2),
          delta: percentDelta(summary?.pages_per_session, previous?.pages_per_session),
          sub: previousLine(period => period.pages_per_session.toFixed(2)),
        },
        {
          id: "bounce",
          icon: <LogOut className="h-3 w-3" />,
          label: t("Bounce rate"),
          value: percent(summary?.bounce_rate),
          delta: pointDelta(summary?.bounce_rate, previous?.bounce_rate),
          upIsGood: false,
          sub: previousLine(period => percent(period.bounce_rate)),
        },
        // A site with no goals has no conversions to report.
        summary?.converted != null && {
          id: "converted",
          icon: <Target className="h-3 w-3" />,
          label: t("Converted"),
          value: percent(convertedShare),
          delta: pointDelta(convertedShare, share(previous?.converted, previous?.sessions)),
          sub: t("{count, plural, one {# session} other {# sessions}}, any goal", { count: summary.converted }),
        },
        {
          id: "errors",
          icon: <TriangleAlert className="h-3 w-3" />,
          label: t("With errors"),
          value: percent(errorShare),
          delta: pointDelta(errorShare, share(previous?.with_errors, previous?.sessions)),
          upIsGood: false,
          sub: t("{count, plural, one {# session} other {# sessions}}", { count: summary?.with_errors ?? 0 }),
        },
      ]}
    />
  );
}
