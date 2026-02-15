"use client";

import NumberFlow from "@number-flow/react";
import { useState } from "react";
import { useGetSiteEventCount } from "../../../api/analytics/hooks/events/useGetSiteEventCount";
import { BucketSelection } from "../../../components/BucketSelection";
import { Card, CardContent } from "../../../components/ui/card";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { cn } from "../../../lib/utils";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { AdsChart } from "./components/AdsChart";
import { AdsCountries } from "./components/AdsCountries";
import { AdsPathnames } from "./components/AdsPathnames";

type AdStat = "ad_click_count" | "ad_impression_count";

export default function AdsPage() {
  const { site } = useStore();

  if (!site) {
    return null;
  }

  return <AdsPageContent />;
}

function AdsPageContent() {
  useSetPageTitle("Rybbit · Ads");
  const [selectedStat, setSelectedStat] = useState<AdStat>("ad_impression_count");
  const { data } = useGetSiteEventCount();

  const totalClicks =
    data?.reduce((sum, p) => sum + p.ad_click_count, 0) ?? 0;
  const totalImpressions =
    data?.reduce((sum, p) => sum + p.ad_impression_count, 0) ?? 0;

  const stats: { key: AdStat; label: string; value: number }[] = [
    {
      key: "ad_impression_count",
      label: "Ad Impressions",
      value: totalImpressions,
    },
    { key: "ad_click_count", label: "Ad Clicks", value: totalClicks },
  ];

  const selectedLabel =
    selectedStat === "ad_click_count" ? "Ad Clicks" : "Ad Impressions";

  return (
    <div className="p-2 md:p-4 max-w-[1100px] mx-auto space-y-3">
      <SubHeader />
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Card
            key={stat.key}
            className={cn(
              "cursor-pointer transition-colors",
              selectedStat === stat.key
                ? "ring-1 ring-neutral-400 dark:ring-neutral-500"
                : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
            )}
            onClick={() => setSelectedStat(stat.key)}
          >
            <CardContent className="py-4">
              <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                {stat.label}
              </div>
              <div className="text-2xl font-semibold">
                <NumberFlow
                  respectMotionPreference={false}
                  value={stat.value}
                  format={{ notation: "compact" }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="h-[350px]">
        <CardContent>
          <div className="flex items-center justify-between mb-2 mt-4">
            <h3 className="text-sm font-medium">{selectedLabel}</h3>
            <BucketSelection />
          </div>
          <AdsChart selectedStat={selectedStat} />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdsCountries />
        <AdsPathnames />
      </div>
    </div>
  );
}
