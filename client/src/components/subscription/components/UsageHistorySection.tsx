import { useExtracted, useLocale } from "next-intl";
import { useState } from "react";
import { useGetOrgEventCount } from "@/api/analytics/hooks/useGetOrgEventCount";
import { LedgerSection } from "@/app/settings/components/Ledger";
import { EventUsageChart } from "@/components/EventUsageChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPeriodDates, PERIODS, PeriodValue } from "@/components/UsageChart";

/** Daily events for the organization, flat in the page, with UsageChart's range control in the section header. */
export function UsageHistorySection({ organizationId }: { organizationId: string }) {
  const t = useExtracted();
  const locale = useLocale();
  const [period, setPeriod] = useState<PeriodValue>("30");

  const { startDate, endDate } = getPeriodDates(period);
  const { data, isLoading, error } = useGetOrgEventCount({
    organizationId,
    startDate,
    endDate,
    timeZone: "UTC",
  });

  const totalEvents = data?.data?.reduce((acc, e) => acc + e.event_count, 0);

  return (
    <LedgerSection
      title={t("Usage history")}
      description={
        totalEvents === undefined
          ? undefined
          : t("{count} events in this range, across all sites.", {
              count: new Intl.NumberFormat(locale).format(totalEvents),
            })
      }
      actions={
        <Tabs value={period} onValueChange={v => setPeriod(v as PeriodValue)}>
          <TabsList className="h-7" aria-label={t("Range")}>
            {PERIODS.map(p => (
              <TabsTrigger key={p.value} value={p.value} className="px-2 py-0.5 text-xs">
                {p.value === "all" ? t("All") : p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      <div className="border-y border-neutral-100 py-4 dark:border-neutral-850">
        <EventUsageChart data={data?.data} isLoading={isLoading} error={error} maxTickCount={6} />
      </div>
    </LedgerSection>
  );
}
