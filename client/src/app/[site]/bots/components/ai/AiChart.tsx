"use client";

import { DateTime } from "luxon";
import { useMemo } from "react";
import { useGetBotTimeSeries } from "../../../../../api/analytics/hooks/bots/useGetBotTimeSeries";
import { BucketSelection } from "../../../../../components/BucketSelection";
import { ChartTooltip } from "../../../../../components/charts/ChartTooltip";
import { TimeSeriesChart } from "../../../../../components/charts/TimeSeriesChart";
import type { TimeSeriesChartPoint } from "../../../../../components/charts/TimeSeriesChart";
import { getChartTimeBounds } from "../../../../../components/charts/timeSeriesChartUtils";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { formatChartDateTime } from "../../../../../lib/dateTimeUtils";
import { getTimezone, useStore } from "../../../../../lib/store";
import { AI_AGENT_COLOR, AI_CRAWLER_COLOR } from "./aiLabels";

type AiPoint = TimeSeriesChartPoint & {
  currentTime: DateTime;
  agents: number;
  crawlers: number;
};

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
      <span className="text-xs text-neutral-700 dark:text-neutral-200">{label}</span>
    </div>
  );
}

export function AiChart() {
  const { site, bucket, time } = useStore();
  const timezone = getTimezone();

  const { data, isLoading, isFetching } = useGetBotTimeSeries({ site, purpose: "ai" });

  const { agentPoints, crawlerPoints, chartMin, chartMax, max } = useMemo(() => {
    const { min: boundsMin, max: boundsMax } = getChartTimeBounds(time, bucket, timezone);

    const now = DateTime.now();
    const lowerBoundMs = boundsMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();
    const agents: AiPoint[] = [];
    const crawlers: AiPoint[] = [];

    data?.forEach(item => {
      const timestamp = DateTime.fromSQL(item.time, { zone: timezone }).toUTC();
      if (timestamp > now) return;
      const timestampMs = timestamp.toMillis();
      if (lowerBoundMs !== undefined && timestampMs < lowerBoundMs) return;
      if (timestampMs > upperBoundMs) return;

      const shared = {
        x: timestamp.toJSDate(),
        currentTime: timestamp,
        agents: item.ai_agent_requests,
        crawlers: item.ai_crawler_requests,
      };
      agents.push({ ...shared, y: item.ai_agent_requests });
      crawlers.push({ ...shared, y: item.ai_crawler_requests });
    });

    const dataMin = agents.length ? agents[0].x : undefined;
    const dataMax = agents.length ? agents[agents.length - 1].x : undefined;

    return {
      agentPoints: agents,
      crawlerPoints: crawlers,
      chartMin: dataMin ?? boundsMin,
      chartMax: dataMax ?? boundsMax ?? now.toJSDate(),
      max: agents.reduce((largest, point) => Math.max(largest, point.agents, point.crawlers), 0),
    };
  }, [bucket, data, time, timezone]);

  const hasData = agentPoints.some(point => point.agents > 0 || point.crawlers > 0);

  return (
    <Card className="overflow-visible">
      {isFetching && (
        <div className="absolute inset-x-0 top-0 h-4 overflow-hidden rounded-t-lg pointer-events-none">
          <CardLoader />
        </div>
      )}
      <CardContent className="p-2 md:p-4 py-3 w-full">
        <div className="flex items-center justify-between px-2 md:px-0">
          <div className="flex items-center gap-4">
            <LegendSwatch color={AI_AGENT_COLOR} label="Agents" />
            <LegendSwatch color={AI_CRAWLER_COLOR} label="Crawlers" />
          </div>
          <BucketSelection />
        </div>
        {isLoading ? (
          <Skeleton className="w-full h-[300px] rounded-md mt-3" />
        ) : !hasData ? (
          <div className="h-[300px] w-full flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <p className="text-lg font-medium">No AI traffic in this period</p>
              <p className="text-sm">Try a wider date range, or check the coverage note below.</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <TimeSeriesChart
              current={agentPoints}
              max={max}
              chartMin={chartMin}
              chartMax={chartMax}
              currentColor={AI_AGENT_COLOR}
              series={[
                { id: "agents", data: agentPoints, color: AI_AGENT_COLOR },
                { id: "crawlers", data: crawlerPoints, color: AI_CRAWLER_COLOR },
              ]}
              yTickFormat={value => Number(value).toLocaleString()}
              renderTooltip={({ point, bucket: tooltipBucket }) => (
                <ChartTooltip>
                  <div className="p-3 min-w-[180px]">
                    <div className="mb-2">{formatChartDateTime(point.currentTime, tooltipBucket)}</div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: AI_AGENT_COLOR }} />
                        <span>Agents</span>
                      </div>
                      <span className="font-medium">{point.agents.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: AI_CRAWLER_COLOR }} />
                        <span>Crawlers</span>
                      </div>
                      <span className="font-medium">{point.crawlers.toLocaleString()}</span>
                    </div>
                  </div>
                </ChartTooltip>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
