"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useGetOrgEventCount } from "../api/analytics/hooks/useGetOrgEventCount";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { EventUsageChart } from "./EventUsageChart";

const PERIODS = [
  { value: "7", label: "7D" },
  { value: "14", label: "14D" },
  { value: "30", label: "30D" },
  { value: "60", label: "60D" },
  { value: "all", label: "All" },
] as const;

type PeriodValue = (typeof PERIODS)[number]["value"];

function getPeriodDates(period: PeriodValue): { startDate?: string; endDate?: string } {
  if (period === "all") return {};
  const end = DateTime.now().toFormat("yyyy-MM-dd");
  const start = DateTime.now().minus({ days: Number(period) }).toFormat("yyyy-MM-dd");
  return { startDate: start, endDate: end };
}

interface UsageChartProps {
  organizationId: string;
  timeZone?: string;
}

export function UsageChart({ organizationId, timeZone = "UTC" }: UsageChartProps) {
  const t = useExtracted();
  const [period, setPeriod] = useState<PeriodValue>("30");

  const { startDate, endDate } = getPeriodDates(period);

  const { data, isLoading, error } = useGetOrgEventCount({
    organizationId,
    startDate,
    endDate,
    timeZone,
  });

  const totalEvents =
    data?.data?.reduce((acc, e) => acc + e.event_count, 0) ?? 0;

  const getPeriodLabel = (): string => {
    switch (period) {
      case "all": return t("All Time");
      case "7": return t("Last 7 Days");
      case "14": return t("Last 14 Days");
      case "30": return t("Last 30 Days");
      case "60": return t("Last 60 Days");
      default: return period;
    }
  };
  const periodLabel = getPeriodLabel();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
          {t("{period} Usage", { period: periodLabel })}
          <Badge variant="outline" className="text-neutral-600 dark:text-neutral-300">
            {t("{count} events", { count: totalEvents.toLocaleString() })}
          </Badge>
        </h3>
        <Tabs value={period} onValueChange={v => setPeriod(v as PeriodValue)}>
          <TabsList className="h-7">
            {PERIODS.map(p => (
              <TabsTrigger key={p.value} value={p.value} className="text-xs px-2 py-0.5">
                {p.value === "all" ? t("All") : p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <EventUsageChart
        data={data?.data}
        isLoading={isLoading}
        error={error}
        maxTickCount={6}
      />
    </div>
  );
}
