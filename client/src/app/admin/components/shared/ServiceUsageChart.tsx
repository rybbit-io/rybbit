"use client";

import { useGetAdminServiceEventCount } from "@/api/admin/hooks/useAdminServiceEventCount";
import { timeZone } from "@/lib/dateTimeUtils";
import { EventUsageChart } from "@/components/EventUsageChart";

interface ServiceUsageChartProps {
  startDate?: string;
  endDate?: string;
  title?: string;
}

export function ServiceUsageChart({ startDate, endDate, title }: ServiceUsageChartProps) {
  const { data, isLoading, error } = useGetAdminServiceEventCount({
    startDate,
    endDate,
    timeZone,
  });

  return (
    <EventUsageChart
      data={data?.data}
      isLoading={isLoading}
      error={error}
      height="h-64"
    />
  );
}
