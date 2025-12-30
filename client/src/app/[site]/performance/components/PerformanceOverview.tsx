"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useGetPerformanceOverview } from "../../../../api/analytics/hooks/performance/useGetPerformanceOverview";
import { Card, CardContent, CardLoader } from "../../../../components/ui/card";
import { useStore } from "../../../../lib/store";
import { PerformanceMetric, usePerformanceStore } from "../performanceStore";
import { formatMetricValue, getMetricColor, getMetricUnit } from "../utils/performanceUtils";
import { PercentileSelector } from "./PercentileSelector";
import { MetricTooltip } from "./shared/MetricTooltip";

const ChangePercentage = ({ current, previous }: { current: number; previous: number }) => {
  const change = ((current - previous) / previous) * 100;

  if (previous === 0) {
    if (current === 0) {
      return <div className="text-sm">0%</div>;
    }
    return <div className="text-sm">+999%</div>;
  }

  if (change === 0) {
    return <div className="text-sm">0%</div>;
  }

  // For performance metrics, lower is better, so we reverse the color logic
  return (
    <div className={cn("text-xs flex items-center gap-1", change < 0 ? "text-green-400" : "text-red-400")}>
      {change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      {Math.abs(change).toFixed(1)}%
    </div>
  );
};

const Stat = ({
  title,
  id,
  value,
  previous,
  isLoading,
}: {
  title: string;
  id: PerformanceMetric;
  value: number;
  previous: number;
  isLoading: boolean;
}) => {
  const { selectedPerformanceMetric, setSelectedPerformanceMetric, selectedPercentile } = usePerformanceStore();

  return (
    <div
      className={cn(
        "flex flex-col cursor-pointer border-r border-neutral-100 dark:border-neutral-800 last:border-r-0 text-nowrap",
        selectedPerformanceMetric === id && "bg-neutral-0 dark:bg-neutral-850"
      )}
      onClick={() => setSelectedPerformanceMetric(id)}
    >
      <div className="flex flex-col px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {title}
          <MetricTooltip metric={id} />
        </div>
        <div className="text-2xl font-medium flex gap-2 items-center justify-between">
          {isLoading ? (
            <>
              <Skeleton className="w-[60px] h-9 rounded-md" />
              <Skeleton className="w-[50px] h-5 rounded-md" />
            </>
          ) : (
            <>
              <span className={getMetricColor(id, value)}>
                <NumberFlow
                  respectMotionPreference={false}
                  value={Number(formatMetricValue(id, value))}
                  format={{ notation: "compact" }}
                />
                <span className="text-sm ml-1">{getMetricUnit(id, value)}</span>
              </span>
              <ChangePercentage current={value} previous={previous} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export function PerformanceOverview() {
  const { site } = useStore();
  const { selectedPercentile } = usePerformanceStore();

  const { data: overviewData, isLoading: isOverviewLoading, isFetching } = useGetPerformanceOverview({ site });

  const { data: overviewDataPrevious, isLoading: isOverviewLoadingPrevious } = useGetPerformanceOverview({
    site,
    periodTime: "previous",
  });

  const isLoading = isOverviewLoading || isOverviewLoadingPrevious;

  const currentData = overviewData?.data ?? {};
  const previousData = overviewDataPrevious?.data ?? {};

  // Helper function to get metric value for selected percentile
  const getMetricValue = (data: any, metric: PerformanceMetric): number => {
    const key = `${metric}_${selectedPercentile}`;
    return data[key] ?? 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Web Vitals</h2>
        <PercentileSelector />
      </div>

      <Card>
        <CardContent className="p-0 w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0 items-center 0 rounded-lg overflow-hidden">
            <Stat
              title="Largest Contentful Paint"
              id="lcp"
              value={getMetricValue(currentData, "lcp")}
              previous={getMetricValue(previousData, "lcp")}
              isLoading={isLoading}
            />
            <Stat
              title="Cumulative Layout Shift"
              id="cls"
              value={getMetricValue(currentData, "cls")}
              previous={getMetricValue(previousData, "cls")}
              isLoading={isLoading}
            />
            <Stat
              title="Interaction to Next Paint"
              id="inp"
              value={getMetricValue(currentData, "inp")}
              previous={getMetricValue(previousData, "inp")}
              isLoading={isLoading}
            />
            <Stat
              title="First Contentful Paint"
              id="fcp"
              value={getMetricValue(currentData, "fcp")}
              previous={getMetricValue(previousData, "fcp")}
              isLoading={isLoading}
            />
            <Stat
              title="Time to First Byte"
              id="ttfb"
              value={getMetricValue(currentData, "ttfb")}
              previous={getMetricValue(previousData, "ttfb")}
              isLoading={isLoading}
            />
          </div>
        </CardContent>
        {isFetching && <CardLoader />}
      </Card>
    </div>
  );
}
