"use client";

import { Button } from "@/components/ui/button";
import { FilterParameter } from "@rybbit/shared";
import { AlertCircle, Info, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { MetricResponse, usePaginatedMetric } from "../../../../../api/analytics/useGetMetric";
import { CardLoader } from "../../../../../components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { IS_CLOUD } from "../../../../../lib/const";
import { Row } from "./Row";
import { StandardSkeleton } from "./Skeleton";
import { StandardSectionDialog } from "./StandardSectionDialog";
import { ErrorState } from "../../../../../components/ErrorState";

const MAX_ITEMS_TO_DISPLAY = 10;

export function StandardSection({
  title,
  getKey,
  getLabel,
  getValue,
  getFilterLabel,
  getLink,
  countLabel,
  filterParameter,
  expanded,
  close,
  hasSubrow,
  getSubrowLabel,
}: {
  title: string;
  getKey: (item: MetricResponse) => string;
  getLabel: (item: MetricResponse) => ReactNode;
  getValue: (item: MetricResponse) => string;
  getFilterLabel?: (item: MetricResponse) => string;
  getLink?: (item: MetricResponse) => string;
  countLabel?: string;
  filterParameter: FilterParameter;
  expanded: boolean;
  close: () => void;
  hasSubrow?: boolean;
  getSubrowLabel?: (item: MetricResponse) => ReactNode;
}) {
  const { data, isLoading, isFetching, error, refetch } = usePaginatedMetric({
    parameter: filterParameter,
    limit: 100,
    page: 1,
  });

  const itemsForDisplay = data?.data;

  const ratio = itemsForDisplay?.[0]?.percentage ? 100 / itemsForDisplay[0].percentage : 1;

  return (
    <>
      {isFetching && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="flex flex-col gap-2 max-h-[344px] overflow-y-auto overflow-x-hidden">
        <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex flex-row gap-1 items-center">
            {title}
            {IS_CLOUD && ["Countries", "Regions", "Cities"].includes(title) && (
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3" />
                </TooltipTrigger>
                <TooltipContent>
                  Geolocation by{" "}
                  <Link href="https://ipapi.is/" target="_blank" className="text-emerald-400 hover:text-emerald-300">
                    ipapi.is
                  </Link>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div>{countLabel || "Sessions"}</div>
        </div>
        {isLoading ? (
          <StandardSkeleton />
        ) : error ? (
          <ErrorState title="Failed to load data" message={error.message} refetch={refetch} />
        ) : (
          <>
            {itemsForDisplay?.length ? (
              itemsForDisplay
                .slice(0, MAX_ITEMS_TO_DISPLAY)
                .map(e => (
                  <Row
                    key={getKey(e)}
                    e={e}
                    ratio={ratio}
                    getKey={getKey}
                    getLabel={getLabel}
                    getValue={getValue}
                    getLink={getLink}
                    filterParameter={filterParameter}
                    getSubrowLabel={getSubrowLabel}
                    hasSubrow={hasSubrow}
                  />
                ))
            ) : (
              <div className="text-neutral-600 dark:text-neutral-300 w-full text-center mt-6 flex flex-row gap-2 items-center justify-center">
                <Info className="w-5 h-5" />
                No Data
              </div>
            )}
          </>
        )}
        {!isLoading && !error && itemsForDisplay?.length ? (
          <div className="flex flex-row gap-2 justify-between items-center">
            <StandardSectionDialog
              title={title}
              ratio={ratio}
              getKey={getKey}
              getLabel={getLabel}
              getValue={getValue}
              getFilterLabel={getFilterLabel}
              getLink={getLink}
              countLabel={countLabel}
              filterParameter={filterParameter}
              expanded={expanded}
              close={close}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
