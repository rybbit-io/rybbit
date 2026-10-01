"use client";

import { Route } from "lucide-react";
import { useId, useState } from "react";
import { useExtracted } from "next-intl";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { useJourneys } from "../../../../../api/analytics/hooks/useGetJourneys";
import { ErrorState } from "../../../../../components/ErrorState";
import { SegmentedControl } from "../../../../../components/interior/segmented-control";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { useStore } from "../../../../../lib/store";
import { SankeyDiagram } from "../../../journeys/components/SankeyDiagram";
import { OpenInLink, ProfileCardHeader } from "./ProfileCard";
import { useProfileHref, userFilter } from "./profileLinks";

const MAX_JOURNEYS = 50;

// Five choices, so each is one click away: a slider hid the values and took
// a drag to move one step.
const STEP_CHOICES = ["2", "3", "4", "5", "6"] as const;
type StepChoice = (typeof STEP_CHOICES)[number];
const STEP_OPTIONS = STEP_CHOICES.map(value => ({ value, label: value }));

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
  const stepsLabelId = useId();
  const [stepChoice, setStepChoice] = useState<StepChoice>("3");
  const steps = Number(stepChoice);

  const { data: siteMetadata } = useGetSite();
  const { time } = useStore();
  const profileHref = useProfileHref();

  const { data, isLoading, isFetching, error, refetch } = useJourneys({
    siteId: siteMetadata?.siteId,
    steps,
    time,
    limit: MAX_JOURNEYS,
    additionalFilters: [userFilter(userId)],
  });

  const journeys = data?.journeys ?? [];

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Step changes keep the previous diagram on screen; signal the refresh
            the same way StandardSection does */}
        {isFetching && !isLoading && <CardLoader />}
        <div className="mb-3">
          <ProfileCardHeader
            title={t("Journeys")}
            note={t("First {steps} pages of each session", { steps: String(steps) })}
            right={
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                  <span id={stepsLabelId} className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t("Steps")}
                  </span>
                  <SegmentedControl<StepChoice>
                    aria-labelledby={stepsLabelId}
                    size="sm"
                    options={STEP_OPTIONS}
                    value={stepChoice}
                    onValueChange={setStepChoice}
                  />
                </div>
                <OpenInLink href={profileHref("journeys", [userFilter(userId)])}>{t("Open in Journeys")}</OpenInLink>
              </div>
            }
          />
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
