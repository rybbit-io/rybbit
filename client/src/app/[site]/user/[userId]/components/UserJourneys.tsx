"use client";

import { Route } from "lucide-react";
import { useState } from "react";
import { useExtracted } from "next-intl";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { useJourneys } from "../../../../../api/analytics/hooks/useGetJourneys";
import { ErrorState } from "../../../../../components/ErrorState";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Slider } from "../../../../../components/ui/slider";
import { useStore } from "../../../../../lib/store";
import { SankeyDiagram } from "../../../journeys/components/SankeyDiagram";

const MAX_JOURNEYS = 50;

// Sankey-shaped placeholder: three columns of node blocks thinning to the right
const SKELETON_COLUMNS: string[][] = [
  ["h-12", "h-7", "h-4"],
  ["h-9", "h-5", "h-3"],
  ["h-6", "h-4"],
];

function JourneysSkeleton() {
  return (
    <div className="flex min-h-[160px] items-start gap-10 py-2" aria-hidden>
      {SKELETON_COLUMNS.map((column, i) => (
        <div key={i} className="flex flex-1 flex-col gap-2.5">
          {column.map((height, j) => (
            <Skeleton key={j} className={`${height} w-full rounded`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function UserJourneys({ userId }: { userId: string }) {
  const t = useExtracted();
  const [steps, setSteps] = useState<number>(3);

  const { data: siteMetadata } = useGetSite();
  const { time } = useStore();

  const { data, isLoading, isFetching, error, refetch } = useJourneys({
    siteId: siteMetadata?.siteId,
    steps,
    time,
    limit: MAX_JOURNEYS,
    additionalFilters: [{ parameter: "user_id", value: [userId], type: "equals" }],
  });

  const journeys = data?.journeys ?? [];

  return (
    <Card>
      <CardContent className="pt-3">
        {/* Step changes keep the previous diagram on screen; signal the refresh
            the same way StandardSection does */}
        {isFetching && !isLoading && <CardLoader />}
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t("Journeys")}</h2>
          <div className="flex w-[150px] items-center gap-2.5">
            <span className="whitespace-nowrap text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {t("{steps} steps", { steps: String(steps) })}
            </span>
            <Slider
              value={[steps]}
              onValueChange={([value]) => setSteps(value)}
              min={2}
              max={6}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
        {isLoading ? (
          <JourneysSkeleton />
        ) : error ? (
          <ErrorState title={t("Failed to load data")} message={error.message} refetch={refetch} />
        ) : journeys.length > 0 && siteMetadata?.domain ? (
          <SankeyDiagram journeys={journeys} steps={steps} maxJourneys={MAX_JOURNEYS} domain={siteMetadata.domain} />
        ) : (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-1 py-4 text-center">
            <Route className="mb-1 h-5 w-5 text-neutral-400 dark:text-neutral-500" />
            <p className="text-sm text-neutral-700 dark:text-neutral-200">{t("No journeys in this range")}</p>
            <p className="max-w-[340px] text-xs text-neutral-500 dark:text-neutral-400">
              {t("Journeys map the paths this user takes through your site. Try a wider date range.")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
