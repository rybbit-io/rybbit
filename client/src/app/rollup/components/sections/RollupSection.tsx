"use client";
import { FilterParameter } from "@rybbit/shared";
import NumberFlow from "@number-flow/react";
import { Info, SquareArrowOutUpRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { ErrorState } from "@/components/ErrorState";
import { CardLoader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { round } from "lodash";
import { StandardSkeleton } from "@/app/[site]/components/shared/StandardSection/Skeleton";
import { MetricResponse } from "@/api/analytics/endpoints";
import { useRollupMetric } from "../../hooks/useRollupMetric";
import { RollupSectionDialog } from "./RollupSectionDialog";

export function RollupSection({
  title,
  filterParameter,
  siteIds,
  getKey,
  getLabel,
  getValue,
  getFilterLabel,
  getLink,
  countLabel,
  expanded,
  close,
}: {
  title: string;
  filterParameter: FilterParameter;
  siteIds: number[];
  getKey: (item: MetricResponse) => string;
  getLabel: (item: MetricResponse) => ReactNode;
  getValue: (item: MetricResponse) => string;
  getFilterLabel?: (item: MetricResponse) => string;
  getLink?: (item: MetricResponse) => string;
  countLabel?: string;
  expanded: boolean;
  close: () => void;
}) {
  const t = useExtracted();
  const { data, isLoading, isFetching, error } = useRollupMetric({
    siteIds,
    parameter: filterParameter,
    limit: 100,
  });

  const items = data;
  const ratio = items[0]?.percentage ? 100 / items[0].percentage : 1;

  return (
    <>
      {isFetching && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
        <div>{title}</div>
        <div>{countLabel || t("Sessions")}</div>
      </div>
      <ScrollArea className="h-[314px]">
        <div className="flex flex-col gap-2 overflow-x-hidden">
          {isLoading ? (
            <StandardSkeleton />
          ) : error ? (
            <ErrorState
              title={t("Failed to load data")}
              message={error.message}
            />
          ) : items.length === 0 ? (
            <div className="text-neutral-600 dark:text-neutral-300 w-full text-center mt-6 flex flex-row gap-2 items-center justify-center">
              <Info className="w-5 h-5" />
              {t("No Data")}
            </div>
          ) : (
            items.map((item) => (
              <div
                key={getKey(item)}
                className="relative h-6 flex items-center group"
              >
                <div
                  className="absolute inset-0 bg-dataviz py-2 opacity-25 rounded-md"
                  style={{ width: `${item.percentage * ratio}%` }}
                />
                <div className="z-10 mx-2 flex justify-between items-center text-xs w-full gap-2">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="truncate">{getLabel(item)}</span>
                    {getLink && (
                      <a
                        href={getLink(item)}
                        rel="noopener noreferrer"
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      >
                        <SquareArrowOutUpRight
                          className="ml-0.5 w-3.5 h-3.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                          strokeWidth={3}
                        />
                      </a>
                    )}
                  </div>
                  <div className="text-xs flex gap-2 shrink-0">
                    <div className="hidden group-hover:block text-neutral-600 dark:text-neutral-400">
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
          )}
        </div>
      </ScrollArea>
      {expanded && (
        <RollupSectionDialog
          title={title}
          filterParameter={filterParameter}
          siteIds={siteIds}
          getLabel={getLabel}
          getValue={getValue}
          getFilterLabel={getFilterLabel}
          getLink={getLink}
          expanded={expanded}
          close={close}
        />
      )}
    </>
  );
}
