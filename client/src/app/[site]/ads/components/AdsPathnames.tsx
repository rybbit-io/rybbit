"use client";

import NumberFlow from "@number-flow/react";
import { Info } from "lucide-react";
import { round } from "lodash";
import { useState } from "react";
import { useGetAdsBreakdown } from "../../../../api/analytics/hooks/ads/useGetAdsBreakdown";
import { ErrorState } from "../../../../components/ErrorState";
import { Card, CardContent, CardLoader } from "../../../../components/ui/card";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/basic-tabs";

function PathnameBreakdownList({ type }: { type: "ad_click" | "ad_impression" }) {
  const { data, isLoading, isFetching, error, refetch } =
    useGetAdsBreakdown("creative_url", type);

  const ratio = data?.[0]?.percentage ? 100 / data[0].percentage : 1;
  const countLabel = type === "ad_click" ? "Clicks" : "Impressions";

  return (
    <>
      {isFetching && <CardLoader />}
      <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
        <div>Creatives</div>
        <div>{countLabel}</div>
      </div>
      <ScrollArea className="h-[300px]">
        <div className="flex flex-col gap-2 overflow-x-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title="Failed to load data"
              message={error.message}
              refetch={refetch}
            />
          ) : data?.length ? (
            data.map((item) => (
              <div
                key={item.value}
                className="relative h-6 flex items-center"
              >
                <div
                  className="absolute inset-0 bg-dataviz py-2 opacity-25 rounded-md"
                  style={{ width: `${item.percentage * ratio}%` }}
                />
                <div className="z-10 mx-2 flex justify-between items-center text-xs w-full gap-2">
                  <span className="truncate min-w-0 flex-1">
                    {item.value}
                  </span>
                  <div className="text-xs flex gap-2 shrink-0">
                    <div className="text-neutral-600 dark:text-neutral-400">
                      {round(item.percentage, 1)}%
                    </div>
                    <NumberFlow
                      respectMotionPreference={false}
                      value={item.count}
                      format={{ notation: "compact" }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-neutral-600 dark:text-neutral-300 w-full text-center mt-6 flex flex-row gap-2 items-center justify-center">
              <Info className="w-5 h-5" />
              No Data
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

export function AdsPathnames() {
  const [tab, setTab] = useState<string>("ad_impression");

  return (
    <Card className="h-[405px]">
      <CardContent className="mt-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ad_impression">Impressions</TabsTrigger>
            <TabsTrigger value="ad_click">Clicks</TabsTrigger>
          </TabsList>
          <TabsContent value="ad_click">
            <PathnameBreakdownList type="ad_click" />
          </TabsContent>
          <TabsContent value="ad_impression">
            <PathnameBreakdownList type="ad_impression" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
