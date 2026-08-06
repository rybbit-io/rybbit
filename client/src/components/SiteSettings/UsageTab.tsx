"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { ReactNode, useState } from "react";

import { EventCountRow } from "@/api/admin/endpoints/adminServiceEventCount";
import { useGetSiteUsage } from "@/api/admin/hooks/useSites";
import { SiteEventCountPoint } from "@/api/analytics/endpoints";
import { useGetSiteEventCount } from "@/api/analytics/hooks/useGetSiteEventCount";
import { EventUsageChart } from "@/components/EventUsageChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { SettingsSection, SettingsSections } from "./SettingsSection";

interface UsageTabProps {
  siteId: number;
}

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

const EMPTY_COUNTS = {
  pageview_count: 0,
  custom_event_count: 0,
  performance_count: 0,
  outbound_count: 0,
  error_count: 0,
  button_click_count: 0,
  copy_count: 0,
  form_submit_count: 0,
  input_change_count: 0,
  event_count: 0,
};

/**
 * The events/count endpoint omits days with no events; fill the gaps with
 * zero rows so the chart dips to zero instead of interpolating across them.
 */
function toEventCountRows(
  points: SiteEventCountPoint[] | undefined,
  startDate?: string,
  endDate?: string
): EventCountRow[] | undefined {
  if (!points) return undefined;
  const rows = points.map(({ time, ...counts }) => ({ event_date: time, ...counts }));
  if (!startDate || !endDate) return rows;

  const byDate = new Map(rows.map(r => [r.event_date.slice(0, 10), r]));
  const filled: EventCountRow[] = [];
  for (
    let day = DateTime.fromISO(startDate), end = DateTime.fromISO(endDate);
    day <= end;
    day = day.plus({ days: 1 })
  ) {
    const key = day.toFormat("yyyy-MM-dd");
    filled.push(byDate.get(key) ?? { event_date: `${key} 00:00:00`, ...EMPTY_COUNTS });
  }
  return filled;
}

function formatPercent(value: number): string {
  if (value === 0) {
    return "0";
  }
  if (value < 0.1) {
    return "<0.1";
  }
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

interface UsageStatProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  /** 0-100 fill for the bottom bar; omit to hide the bar */
  percent?: number;
  /** color the bar by proximity to a hard limit: amber past 80%, red at 100% */
  isLimit?: boolean;
}

function UsageStat({ label, value, caption, percent, isLimit }: UsageStatProps) {
  const barColor =
    isLimit && percent !== undefined && percent >= 100
      ? "bg-red-500"
      : isLimit && percent !== undefined && percent > 80
        ? "bg-amber-500"
        : "bg-accent-400/75";
  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-150 p-3 pb-4 dark:border-neutral-800">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground">{value}</div>
      {caption && <div className="mt-0.5 text-xs text-muted-foreground">{caption}</div>}
      {percent !== undefined && (
        <div className="absolute bottom-0 left-0 h-1 w-full bg-neutral-100 dark:bg-neutral-800">
          <div className={cn("h-1", barColor)} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

export function UsageTab({ siteId }: UsageTabProps) {
  const t = useExtracted();
  const { data: usage, isLoading, error } = useGetSiteUsage(siteId);

  const [period, setPeriod] = useState<PeriodValue>("30");
  const { startDate, endDate } = getPeriodDates(period);
  const {
    data: eventCounts,
    isLoading: chartLoading,
    error: chartError,
  } = useGetSiteEventCount({ siteId, startDate, endDate });

  const dayOfMonth = usage ? Math.min(Math.floor(usage.daysElapsed) + 1, usage.daysInMonth) : null;

  return (
    <SettingsSections>
      <SettingsSection
        title={t("This Month")}
        description={t("Usage resets at the start of each calendar month.")}
        action={
          dayOfMonth !== null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("Day {day} of {total}", { day: String(dayOfMonth), total: String(usage!.daysInMonth) })}
            </span>
          )
        }
      >
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{t("Failed to load usage")}</p>
        ) : isLoading || !usage ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-[92px] rounded-lg" />
            <Skeleton className="h-[92px] rounded-lg" />
            <Skeleton className="h-[92px] rounded-lg" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <UsageStat
              label={t("Events this month")}
              value={usage.siteEventsThisMonth.toLocaleString()}
              caption={
                usage.orgEventsThisMonth > 0
                  ? t("{percent}% of your organization's events", {
                      percent: formatPercent((usage.siteEventsThisMonth / usage.orgEventsThisMonth) * 100),
                    })
                  : undefined
              }
              percent={usage.orgEventsThisMonth > 0 ? (usage.siteEventsThisMonth / usage.orgEventsThisMonth) * 100 : 0}
            />
            <UsageStat
              label={t("Organization events")}
              value={`${usage.orgEventsThisMonth.toLocaleString()} / ${
                usage.orgEventLimit === null ? t("Unlimited") : usage.orgEventLimit.toLocaleString()
              }`}
              percent={
                usage.orgEventLimit !== null && usage.orgEventLimit > 0
                  ? (usage.orgEventsThisMonth / usage.orgEventLimit) * 100
                  : undefined
              }
              isLimit
            />
            <UsageStat
              label={t("Projected by month end")}
              value={usage.projectedSiteEvents === null ? "—" : usage.projectedSiteEvents.toLocaleString()}
              caption={
                usage.projectedSiteEvents === null
                  ? t("Not enough data yet")
                  : usage.orgEventLimit !== null && usage.orgEventLimit > 0
                    ? t("{percent}% of your organization's event limit", {
                        percent: formatPercent((usage.projectedSiteEvents / usage.orgEventLimit) * 100),
                      })
                    : undefined
              }
              percent={
                usage.projectedSiteEvents !== null && usage.orgEventLimit !== null && usage.orgEventLimit > 0
                  ? (usage.projectedSiteEvents / usage.orgEventLimit) * 100
                  : undefined
              }
              isLimit
            />
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title={t("Daily Events")}
        action={
          <Tabs value={period} onValueChange={v => setPeriod(v as PeriodValue)}>
            <TabsList className="h-7">
              {PERIODS.map(p => (
                <TabsTrigger key={p.value} value={p.value} className="text-xs px-2 py-0.5">
                  {p.value === "all" ? t("All") : p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      >
        <EventUsageChart
          data={toEventCountRows(eventCounts, startDate, endDate)}
          isLoading={chartLoading}
          error={chartError}
          maxTickCount={6}
        />
      </SettingsSection>
    </SettingsSections>
  );
}
