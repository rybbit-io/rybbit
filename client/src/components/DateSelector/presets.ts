import { useExtracted } from "next-intl";
import type { DashboardDefaultTimeRange } from "@/lib/defaultTimeRange";

/**
 * One place that names a preset, shared by the menu and by the trigger label —
 * they used to be two switch statements that had already drifted apart.
 */
export function usePresetLabels(): Record<DashboardDefaultTimeRange, string> {
  const t = useExtracted();

  return {
    today: t("Today"),
    yesterday: t("Yesterday"),
    "last-3-days": t("Last 3 Days"),
    "last-7-days": t("Last 7 Days"),
    "last-14-days": t("Last 14 Days"),
    "last-30-days": t("Last 30 Days"),
    "last-60-days": t("Last 60 Days"),
    "last-30-minutes": t("Last 30 Minutes"),
    "last-1-hour": t("Last 1 Hour"),
    "last-6-hours": t("Last 6 Hours"),
    "last-24-hours": t("Last 24 Hours"),
    "this-week": t("This Week"),
    "last-week": t("Last Week"),
    "this-month": t("This Month"),
    "last-month": t("Last Month"),
    "this-year": t("This Year"),
    "all-time": t("All Time"),
  };
}
