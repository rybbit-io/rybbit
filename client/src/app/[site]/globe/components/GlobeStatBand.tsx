"use client";

import { ChartPie, Earth, Flag, Radio, TrendingUp } from "lucide-react";
import { useExtracted } from "next-intl";
import { useGetGeoBreakdown } from "../../../../api/analytics/hooks/useGetGeoBreakdown";
import { useGetLiveUserCount } from "../../../../api/analytics/hooks/useGetLiveUserCount";
import { StatBand } from "../../../../components/site/StatBand";
import { percentDelta } from "../../../../lib/delta";
import { useComparisonEnabled } from "../../../../lib/store";
import { getCountryName } from "../../../../lib/utils";
import { ONLINE_MINUTES, OnlineLocations } from "../hooks/useOnlineLocations";
import { countDelta, countryStats } from "../utils/places";

const formatShare = (share: number) => `${share.toFixed(1)}%`;

/**
 * The page's opening figures: how many countries the traffic reaches, how
 * concentrated it is, where it grew most, and who is on the site now. Always
 * by country and for the whole period, whatever the map is broken down by.
 */
export function GlobeStatBand({ online }: { online: OnlineLocations }) {
  const t = useExtracted();
  const comparing = useComparisonEnabled();
  const current = useGetGeoBreakdown({ level: "country" });
  const previous = useGetGeoBreakdown({ level: "country", periodTime: "previous" });
  const live = useGetLiveUserCount(ONLINE_MINUTES);

  const stats = countryStats(current.data, comparing ? previous.data : undefined);
  const isLoading = current.isLoading;
  // The comparison arrives after the period itself; its lines fill in then.
  const hasComparison = comparing && !!previous.data;
  const empty = "–";

  return (
    <StatBand
      isLoading={isLoading}
      cells={[
        {
          id: "countries",
          icon: <Earth className="h-3 w-3" />,
          label: t("Countries"),
          value: stats ? stats.countries.toLocaleString() : empty,
          delta: stats && hasComparison ? countDelta(stats.countries, stats.previousCountries) : null,
          sub:
            stats && hasComparison && stats.previousCountries !== null
              ? t("{count} in the comparison period", { count: stats.previousCountries.toLocaleString() })
              : t("with at least one session"),
        },
        {
          id: "top-country",
          icon: <Flag className="h-3 w-3" />,
          label: t("Top country share"),
          value: stats?.top ? formatShare(stats.top.share) : empty,
          sub: stats?.top
            ? hasComparison && stats.top.previousShare !== null
              ? t("{country}, {share} before", {
                  country: getCountryName(stats.top.key),
                  share: formatShare(stats.top.previousShare),
                })
              : getCountryName(stats.top.key)
            : "",
          title: t("Share of sessions from the country with the most sessions"),
        },
        {
          id: "top-five",
          icon: <ChartPie className="h-3 w-3" />,
          label: t("Top 5 share"),
          value: stats?.topFive ? formatShare(stats.topFive.share) : empty,
          sub: stats?.topFive
            ? hasComparison && stats.topFive.previousShare !== null
              ? t("{countries}, {share} before", {
                  countries: stats.topFive.keys.join(", "),
                  share: formatShare(stats.topFive.previousShare),
                })
              : stats.topFive.keys.join(", ")
            : "",
          title: t("Share of sessions from the five countries with the most sessions"),
        },
        // Growth needs a comparison period, so the cell goes when comparing is off.
        comparing && {
          id: "fastest",
          icon: <TrendingUp className="h-3 w-3" />,
          label: t("Fastest growing"),
          isLoading: isLoading || previous.isLoading,
          value: stats?.fastest ? getCountryName(stats.fastest.key) : empty,
          delta: stats?.fastest ? percentDelta(stats.fastest.sessions, stats.fastest.previousSessions) : null,
          sub: stats?.fastest
            ? t("{sessions} sessions, {share} of all", {
                sessions: stats.fastest.sessions.toLocaleString(),
                share: formatShare(stats.fastest.share),
              })
            : t("No country grew"),
          title: t("Largest rise in sessions among countries with at least 0.5% of them and 10 in both periods"),
        },
        {
          id: "online",
          icon: <Radio className="h-3 w-3" />,
          label: t("Online now"),
          isLoading: live.isLoading,
          value: (live.data?.count ?? 0).toLocaleString(),
          sub: online.isLoading
            ? ""
            : t("{countries} countries, {cities} cities", {
                countries: online.countries.toLocaleString(),
                cities: online.cities.toLocaleString(),
              }),
          title: t("Visitors active in the last {minutes} minutes", { minutes: String(ONLINE_MINUTES) }),
        },
      ]}
    />
  );
}
