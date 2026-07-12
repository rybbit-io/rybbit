"use client";

import { useState } from "react";
import { useExtracted } from "next-intl";
import { Route } from "lucide-react";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { useJourneys } from "../../../../../api/analytics/hooks/useGetJourneys";
import { ErrorState } from "../../../../../components/ErrorState";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Slider } from "../../../../../components/ui/slider";
import { useStore } from "../../../../../lib/store";
import { SankeyDiagram } from "../../../journeys/components/SankeyDiagram";

const MAX_JOURNEYS = 50;

export function UserJourneys({ userId }: { userId: string }) {
  const t = useExtracted();
  const [steps, setSteps] = useState<number>(3);

  const { data: siteMetadata } = useGetSite();
  const { time } = useStore();

  const { data, isLoading, error, refetch } = useJourneys({
    siteId: siteMetadata?.siteId,
    steps,
    time,
    limit: MAX_JOURNEYS,
    additionalFilters: [{ parameter: "user_id", value: [userId], type: "equals" }],
  });

  const journeys = data?.journeys ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
          {t("The most common page sequences for this user, ordered from first step to last.")}
        </p>
        <div className="flex w-full shrink-0 items-center gap-3 sm:w-[190px]">
          <span className="whitespace-nowrap text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {t("{steps} steps", { steps: String(steps) })}
          </span>
          <Slider
            value={[steps]}
            onValueChange={([value]) => setSteps(value)}
            min={2}
            max={6}
            step={1}
            aria-label={t("Journey steps")}
            className="flex-1"
          />
        </div>
      </div>

      <div className="min-h-[220px]">
        {isLoading ? (
          <div className="space-y-5 py-5" aria-label={t("Loading journey data...")}>
            <Skeleton className="h-3 w-3/4 motion-reduce:animate-none" />
            <Skeleton className="h-12 w-full motion-reduce:animate-none" />
            <Skeleton className="h-12 w-5/6 motion-reduce:animate-none" />
            <Skeleton className="h-12 w-2/3 motion-reduce:animate-none" />
          </div>
        ) : error ? (
          <ErrorState
            title={t("Failed to load journey data")}
            message={t("The path summary is temporarily unavailable. Try again in a moment.")}
            refetch={refetch}
          />
        ) : journeys.length > 0 && siteMetadata?.domain ? (
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[620px]">
              <SankeyDiagram
                journeys={journeys}
                steps={steps}
                maxJourneys={MAX_JOURNEYS}
                domain={siteMetadata.domain}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 text-center">
            <Route className="h-7 w-7 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{t("No journey data yet")}</p>
            <p className="max-w-md text-sm text-neutral-600 dark:text-neutral-400">
              {t("Journeys appear after this user has visited at least two pages in the selected range.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
