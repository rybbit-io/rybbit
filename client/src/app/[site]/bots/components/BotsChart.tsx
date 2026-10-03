"use client";

import { Info } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useMemo } from "react";
import { useGetAiVisitsSeries } from "../../../../api/analytics/hooks/bots/useAiVisits";
import { useGetBotOverview } from "../../../../api/analytics/hooks/bots/useGetBotOverview";
import { useGetBotTimeSeries } from "../../../../api/analytics/hooks/bots/useGetBotTimeSeries";
import { ErrorState } from "../../../../components/ErrorState";
import { ChartLegend, type ChartLegendItem } from "../../../../components/site/ChartLegend";
import { Card, CardLoader } from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useStore, useTimezone } from "../../../../lib/store";
import {
  AI_PURPOSE_COLORS,
  AI_PURPOSE_KEYS,
  BOT_FAMILY_COLORS,
  BOT_FAMILY_KEYS,
  SERIES_COLORS,
  aiPurposeCounts,
  botFamilyCounts,
  formatCompact,
  startedBuckets,
} from "../botsData";
import { type BotsLens, useBotsStore } from "../botsStore";
import { useAiSignups } from "../useAiSignups";
import { useAiPurposeLabels, useBotFamilyLabels } from "./ai/aiLabels";
import { BotStackedChart, PREVIOUS_COLOR, type StackedRow, type StackedSeries } from "./BotStackedChart";

const CHART_HEIGHT = 220;
const STRIP_HEIGHT = 96;
const VISITS_COLOR = "hsl(var(--dataviz-2))";

/**
 * The dashboard is honest about its vantage point or it is not trustworthy.
 * Rybbit only sees a request if the page ran its script, so a crawler that
 * fetches HTML and executes nothing never appears here at all. Without saying
 * so, a low AI number reads as "nobody is crawling me" when it may mean "the
 * ones crawling you are invisible from the browser".
 */
function CoverageNote() {
  const t = useExtracted();
  return (
    <div className="flex items-start gap-2 border-t border-neutral-100 px-4 py-2.5 text-xs leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p>
        {t(
          "These counts cover bots that run JavaScript. Crawlers that fetch your HTML and run nothing, which includes most training crawlers, reach Rybbit only when your server reports them through the tracking API."
        )}
      </p>
    </div>
  );
}

/** Sessions AI products sent, on the same buckets as the chart above it. */
function VisitsStrip({ rows }: { rows: StackedRow[] }) {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const bucket = useStore(state => state.bucket);
  const time = useStore(state => state.time);
  const { data: overview } = useGetBotOverview({ site });
  const signups = useAiSignups();

  const series = useMemo<StackedSeries[]>(
    () => [{ id: "visits", label: t("Visits sent back"), color: VISITS_COLOR }],
    [t]
  );

  const sessions = overview ? Number(overview.ai_sessions ?? 0) : null;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pt-1">
        <h3 className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{t("Visits sent back")}</h3>
        {sessions !== null && (
          <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {t("{count, plural, one {# session} other {# sessions}} from AI products", { count: sessions })}
            {signups && (
              <>
                {" · "}
                <span title={t('Conversions of the goal "{goal}"', { goal: signups.goalName })}>
                  {t("{count, number} signed up", { count: signups.signups })}
                </span>
              </>
            )}
          </span>
        )}
      </div>
      <div className="px-2 pb-1 md:px-3">
        <BotStackedChart
          rows={rows}
          series={series}
          bucket={bucket}
          time={time}
          height={STRIP_HEIGHT}
          yTicks={2}
          ariaLabel={t("Sessions that arrived from AI products over time")}
        />
      </div>
    </>
  );
}

/**
 * The page's chart, under either lens: requests per bucket stacked by what the
 * bots were for, with the comparison period's total as a dashed line. The AI
 * lens adds what came back, on the same time axis.
 */
export function BotsChart({ lens }: { lens: BotsLens }) {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const bucket = useStore(state => state.bucket);
  const time = useStore(state => state.time);
  const timezone = useTimezone();
  const breakdown = useBotsStore(state => state.breakdown);
  const purposeLabels = useAiPurposeLabels();
  const familyLabels = useBotFamilyLabels();

  const purpose = lens === "ai" ? "ai" : undefined;
  const { data, isLoading, isFetching, error, refetch } = useGetBotTimeSeries({ site, purpose });
  const { data: previousData, isFetching: isPreviousFetching } = useGetBotTimeSeries({
    site,
    purpose,
    periodTime: "previous",
  });

  const title = lens === "ai" ? t("AI requests") : t("Bot requests");
  const totalLabel = t("Total");

  const { rows, series, totals } = useMemo(() => {
    const points = startedBuckets(data, timezone, DateTime.now());
    const split = breakdown === "purpose";

    const series: StackedSeries[] = !split
      ? [{ id: "total", label: title, color: SERIES_COLORS.periwinkle }]
      : lens === "ai"
        ? AI_PURPOSE_KEYS.map(key => ({ id: key, label: purposeLabels[key], color: AI_PURPOSE_COLORS[key] }))
        : BOT_FAMILY_KEYS.map(key => ({ id: key, label: familyLabels[key], color: BOT_FAMILY_COLORS[key] }));

    const rows: StackedRow[] = points.map(point => ({
      time: point.time,
      values: !split
        ? { total: Number(point.bot_requests ?? 0) }
        : lens === "ai"
          ? aiPurposeCounts(point)
          : botFamilyCounts(point),
    }));

    const totals = Object.fromEntries(
      series.map(item => [item.id, rows.reduce((total, row) => total + (row.values[item.id] ?? 0), 0)])
    );

    return { rows, series, totals };
  }, [data, timezone, breakdown, lens, title, purposeLabels, familyLabels]);

  const previous = useMemo(() => previousData?.map(point => Number(point.bot_requests ?? 0)), [previousData]);
  const previousTotal = previous?.reduce((total, value) => total + value, 0);

  const hasData = rows.some(row => Object.values(row.values).some(value => value > 0));
  const failed = !!error && !data;

  // What came back, laid onto the chart's own buckets so the two share an axis.
  const { data: visits } = useGetAiVisitsSeries({ enabled: lens === "ai" });
  const visitRows = useMemo<StackedRow[]>(() => {
    const byTime = new Map((visits ?? []).map(point => [point.time, Number(point.sessions ?? 0)]));
    return rows.map(row => ({ time: row.time, values: { visits: byTime.get(row.time) ?? 0 } }));
  }, [visits, rows]);
  // The strip carries the time axis when it is there; without visits the chart keeps it.
  const showStrip = lens === "ai" && !isLoading && !failed && visitRows.some(row => row.values.visits > 0);

  const legend: ChartLegendItem[] = [
    ...series.map(item => ({
      id: item.id,
      label: `${item.label} ${formatCompact(totals[item.id] ?? 0)}`,
      color: item.color,
    })),
    ...(previousTotal !== undefined
      ? [
          {
            id: "previous",
            label: `${t("Comparison period")} ${formatCompact(previousTotal)}`,
            color: PREVIOUS_COLOR,
            dashed: true,
          },
        ]
      : []),
  ];

  return (
    <Card className="overflow-visible">
      {(isFetching || isPreviousFetching) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-4 overflow-hidden rounded-t-lg">
          <CardLoader />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-3.5">
        <h2 className="font-semibold leading-none tracking-tight">{title}</h2>
        {hasData && <ChartLegend items={legend} />}
      </div>
      {failed ? (
        <div className="px-4 py-6">
          <ErrorState title={t("Failed to load data")} message={error.message} refetch={refetch} />
        </div>
      ) : isLoading ? (
        <div className="px-4 pb-4 pt-3">
          <Skeleton className="w-full rounded-md" style={{ height: CHART_HEIGHT - 16 }} />
        </div>
      ) : !hasData ? (
        <div className="flex w-full items-center justify-center px-4 text-center" style={{ height: CHART_HEIGHT }}>
          <div>
            <p className="font-medium text-neutral-700 dark:text-neutral-200">
              {lens === "ai" ? t("No AI traffic in this period") : t("No bot requests in this period")}
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {t("Try a wider date range, or check the coverage note below.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-2 pt-2 md:px-3">
          <BotStackedChart
            rows={rows}
            series={series}
            previous={previous}
            previousLabel={t("Comparison period")}
            totalLabel={totalLabel}
            bucket={bucket}
            time={time}
            height={CHART_HEIGHT}
            showXAxis={!showStrip}
            ariaLabel={
              lens === "ai" ? t("AI requests over time by purpose") : t("Bot requests over time by kind of bot")
            }
          />
        </div>
      )}
      {showStrip && <VisitsStrip rows={visitRows} />}
      <CoverageNote />
    </Card>
  );
}
