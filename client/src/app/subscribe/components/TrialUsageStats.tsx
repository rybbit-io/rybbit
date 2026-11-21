import { TrendingUp } from "lucide-react";
import { useExtracted } from "next-intl";
import React from "react";

interface TrialUsageStatsProps {
  currentUsage: number;
  daysInTrial: number;
  projectedMonthlyUsage: number;
}

// Calculate days elapsed since a date
export function daysElapsed(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Extrapolate monthly usage based on current usage and days elapsed
export function extrapolateMonthlyUsage(eventCount: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return eventCount;
  const dailyRate = eventCount / daysElapsed;
  return Math.round(dailyRate * 30); // Extrapolate to 30 days
}

export function TrialUsageStats({ currentUsage, daysInTrial, projectedMonthlyUsage }: TrialUsageStatsProps) {
  const t = useExtracted();
  return (
    <div className="max-w-lg mx-auto mt-6">
      <div className="bg-blue-900/20 rounded-xl border border-blue-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-lg">{t("Your Trial Usage")}</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-sm text-neutral-400">{t("Current Usage")}</p>
            <p className="text-xl font-semibold">{t("{count} events", { count: currentUsage.toLocaleString() })}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">{t("Days in Trial")}</p>
            <p className="text-xl font-semibold">{t("{count} days", { count: String(daysInTrial) })}</p>
          </div>
        </div>
        <div className="bg-blue-950/50 p-3 rounded-lg">
          <p className="text-sm text-neutral-300 mb-1">{t("Projected Monthly Usage")}</p>
          <p className="text-2xl font-bold text-blue-300">{t("{count} events/month", { count: projectedMonthlyUsage.toLocaleString() })}</p>
          <p className="text-xs text-neutral-400 mt-1">{t("Based on your current usage pattern")}</p>
        </div>
      </div>
    </div>
  );
}
