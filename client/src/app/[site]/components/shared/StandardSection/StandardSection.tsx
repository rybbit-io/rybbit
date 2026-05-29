"use client";

import { Filter, FilterParameter } from "@rybbit/shared";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Info, Loader2 } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { ReactNode, useEffect, useMemo } from "react";
import { useInfiniteMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { MetricResponse } from "../../../../../api/analytics/endpoints";
import { ErrorState } from "../../../../../components/ErrorState";
import { CardLoader } from "../../../../../components/ui/card";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { IS_CLOUD } from "../../../../../lib/const";
import { Row } from "./Row";
import { StandardSkeleton } from "./Skeleton";
import { StandardSectionDialog } from "./StandardSectionDialog";
import { Time } from "../../../../../components/DateSelector/types";

export type StandardSectionBaseProps = {
  title: string;
  getKey: (item: MetricResponse) => string;
  getLabel: (item: MetricResponse) => ReactNode;
  getValue: (item: MetricResponse) => string;
  getFilterLabel?: (item: MetricResponse) => string;
  getLink?: (item: MetricResponse) => string;
  countLabel?: string;
  filterParameter: FilterParameter;
  hasSubrow?: boolean;
  getSubrowLabel?: (item: MetricResponse) => ReactNode;
  customFilters?: Filter[];
  customTime?: Time;
  lite?: boolean;
};

type StandardSectionProps = StandardSectionBaseProps & {
  expanded?: boolean;
  close?: () => void;
  renderDialog?: boolean;
};

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
  customFilters,
  customTime,
  lite = false,
  renderDialog = true,
}: StandardSectionProps) {
  const t = useExtracted();
  const { data, isLoading, isFetching, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteMetric({
      parameter: filterParameter,
      limit: 100,
      customFilters,
      customTime,
      lite,
    });

  // Load more when the sentinel near the bottom of the scroll area becomes
  // visible. root: null relies on IntersectionObserver respecting the
  // ScrollArea viewport's clipping, matching the dialog's infinite scroll.
  const [loadMoreRef, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px",
  });

  const itemsForDisplay = useMemo(() => data?.pages.flatMap(page => page.data), [data]);

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  const ratio = itemsForDisplay?.[0]?.percentage ? 100 / itemsForDisplay[0].percentage : 1;

  return (
    <>
      {isFetching && !isFetchingNextPage && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
        <div className="flex flex-row gap-1 items-center">
          {title}
          {IS_CLOUD && ["Countries", "Regions", "Cities"].includes(title) && (
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3" />
              </TooltipTrigger>
              <TooltipContent>
                {t("Geolocation by")}{" "}
                <Link
                  href="https://www.maxmind.com/"
                  target="_blank"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Maxmind
                </Link>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div>{countLabel || t("Sessions")}</div>
      </div>
      <ScrollArea className="h-[314px]">
        <div className="flex flex-col gap-2 overflow-x-hidden">
          {isLoading ? (
            <StandardSkeleton />
          ) : error ? (
            <ErrorState title={t("Failed to load data")} message={error.message} refetch={refetch} />
          ) : (
            <>
              {itemsForDisplay?.length ? (
                itemsForDisplay
                  // .slice(0, MAX_ITEMS_TO_DISPLAY)
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
                  {t("No Data")}
                </div>
              )}
              {itemsForDisplay?.length ? (
                <div ref={loadMoreRef} className="flex justify-center py-1">
                  {isFetchingNextPage && (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-600 dark:text-neutral-400" />
                  )}
                </div>
              ) : null}
            </>
          )}
          {renderDialog && close && !isLoading && !error && itemsForDisplay?.length ? (
            <div className="flex flex-row gap-2 justify-between items-center">
              <StandardSectionDialog
                title={title}
                getKey={getKey}
                getLabel={getLabel}
                getValue={getValue}
                getFilterLabel={getFilterLabel}
                getLink={getLink}
                countLabel={countLabel}
                filterParameter={filterParameter}
                expanded={expanded}
                close={close}
                customFilters={customFilters}
                customTime={customTime}
                lite={lite}
              />
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </>
  );
}
