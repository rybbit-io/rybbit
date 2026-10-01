import { useExtracted } from "next-intl";
import type { GlobeMetric, PlaceLevel } from "../globeStore";

export const GLOBE_METRICS: GlobeMetric[] = ["sessions", "users", "pageviews", "bounce_rate"];

/** A metric's figure as the page prints it: a whole number, or a rate with one decimal. */
export const formatMetric = (metric: GlobeMetric, value: number): string =>
  metric === "bounce_rate" ? `${value.toFixed(1)}%` : value.toLocaleString();

/** The metric and level names the toolbar, legend, list and card share. */
export function useMetricLabels() {
  const t = useExtracted();

  const metricLabels: Record<GlobeMetric, string> = {
    sessions: t("Sessions"),
    users: t("Users"),
    pageviews: t("Pageviews"),
    bounce_rate: t("Bounce rate"),
  };
  // Lower case, for sentences: "3.4% of all sessions".
  const metricNouns: Record<GlobeMetric, string> = {
    sessions: t("sessions"),
    users: t("users"),
    pageviews: t("pageviews"),
    bounce_rate: t("sessions"),
  };
  const levelLabels: Record<PlaceLevel, string> = {
    country: t("Country"),
    region: t("Region"),
    city: t("City"),
  };
  const levelPlurals: Record<PlaceLevel, string> = {
    country: t("Countries"),
    region: t("Regions"),
    city: t("Cities"),
  };

  return { metricLabels, metricNouns, levelLabels, levelPlurals };
}
