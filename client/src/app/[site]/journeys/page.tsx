"use client";

import { useExtracted } from "next-intl";
import { useJourneys } from "@/api/analytics/hooks/useGetJourneys";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InputWithSuggestions, SuggestionOption } from "@/components/ui/input-with-suggestions";
import { Slider } from "@/components/ui/slider";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useGetSite } from "../../../api/admin/hooks/useSites";
import { useMetric } from "../../../api/analytics/hooks/useGetMetric";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { timeZone } from "../../../lib/dateTimeUtils";
import { useStore } from "../../../lib/store";
import { JOURNEY_PAGE_FILTERS } from "../../../lib/filterGroups";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { SankeyDiagram } from "./components/SankeyDiagram";

export default function JourneysPage() {
  const t = useExtracted();
  useSetPageTitle("Journeys");

  const [steps, setSteps] = useState<number>(4);
  const [maxJourneys, setMaxJourneys] = useState<number>(50);
  const [stepFilters, setStepFilters] = useState<Record<number, string>>({});

  const { data: siteMetadata } = useGetSite();
  const { time } = useStore();

  // Fetch path suggestions
  const { data: pathsData } = useMetric({
    parameter: "pathname",
    limit: 1000,
    useFilters: false,
  });

  const pathSuggestions: SuggestionOption[] =
    pathsData?.data?.map(item => ({
      value: item.value,
      label: item.value,
    })) ?? [];

  const { data, isLoading, error } = useJourneys({
    siteId: siteMetadata?.siteId,
    steps,
    timeZone,
    time,
    limit: maxJourneys,
    stepFilters,
  });

  return (
    <DisabledOverlay message="User Journeys" featurePath="journeys">
      <div className="container mx-auto p-2 md:p-4">
        <SubHeader availableFilters={JOURNEY_PAGE_FILTERS} />
        <div className="flex items-center gap-6 my-2">
          <div className="flex items-center gap-3 w-[180px]">
            <span className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-nowrap">{t("{steps} steps", { steps: String(steps) })}</span>
            <Slider
              value={[steps]}
              onValueChange={([value]) => setSteps(value)}
              min={2}
              max={6}
              step={1}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3 w-[200px]">
            <span className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
              {t("{maxJourneys} journeys", { maxJourneys: String(maxJourneys) })}
            </span>
            <Slider
              value={[maxJourneys]}
              onValueChange={([value]) => setMaxJourneys(value)}
              min={10}
              max={200}
              step={10}
              className="flex-1"
            />
          </div>
        </div>

        {siteMetadata?.domain ? (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/30 dark:bg-neutral-900/30 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full border-2 border-accent-400 border-t-transparent animate-spin"></div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">{t("Loading journey data...")}</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1 mb-4 mt-4">
              <div className="flex gap-1">
                {Array.from({ length: steps }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-10 bg-neutral-50 dark:bg-neutral-850 flex items-center text-neutral-900 dark:text-white text-sm relative px-3"
                    style={{
                      clipPath: "polygon(0 0, 10px 50%, 0 100%, calc(100% - 10px) 100%, 100% 50%, calc(100% - 10px) 0)",
                    }}
                  >
                    <span className="ml-2 whitespace-nowrap text-neutral-700 dark:text-neutral-200">{t("Step {number}", { number: String(i + 1) })}</span>
                    <InputWithSuggestions
                      suggestions={pathSuggestions}
                      placeholder={t("Path filter")}
                      value={stepFilters[i] || ""}
                      onChange={e => {
                        const newFilters = { ...stepFilters };
                        if (e.target.value) {
                          newFilters[i] = e.target.value;
                        } else {
                          delete newFilters[i];
                        }
                        setStepFilters(newFilters);
                      }}
                      className="h-7 bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 ml-3 mr-3"
                    />
                  </div>
                ))}
              </div>
              <div className="text-xs text-neutral-500">
                {t("Use * to match a single path segment, ** to match multiple segments")}
              </div>
            </div>
            {data?.journeys?.length && data?.journeys?.length > 0 ? (
              <SankeyDiagram
                journeys={data.journeys}
                steps={steps}
                maxJourneys={maxJourneys}
                domain={siteMetadata.domain}
              />
            ) : null}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("Error")}</AlertTitle>
                <AlertDescription>{t("Failed to load journey data. Please try again.")}</AlertDescription>
              </Alert>
            )}

            {data?.journeys?.length === 0 && !isLoading && !error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("No Data")}</AlertTitle>
                <AlertDescription>{t("No journey data found for the selected criteria.")}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}
      </div>
    </DisabledOverlay>
  );
}
