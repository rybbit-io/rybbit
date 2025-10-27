"use client";

import { Button } from "@/components/ui/button";
import { FilterParameter } from "@rybbit/shared";
import { AlertCircle, Info, RefreshCcw } from "lucide-react";
import { ReactNode } from "react";
import { usePaginatedSingleCol } from "../../../../../api/analytics/useSingleCol";
import { SingleColResponse } from "../../../../../api/analytics/useSingleCol";
import { CardLoader } from "../../../../../components/ui/card";
import { Row } from "./Row";
import { Skeleton } from "./Skeleton";
import { StandardSectionDialog } from "./StandardSectionDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import Link from "next/link";
import { IS_CLOUD } from "../../../../../lib/const";

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
  getKey: (item: SingleColResponse) => string;
  getLabel: (item: SingleColResponse) => ReactNode;
  getValue: (item: SingleColResponse) => string;
  getFilterLabel?: (item: SingleColResponse) => string;
  getLink?: (item: SingleColResponse) => string;
  countLabel?: string;
  filterParameter: FilterParameter;
  expanded: boolean;
  close: () => void;
  hasSubrow?: boolean;
  getSubrowLabel?: (item: SingleColResponse) => ReactNode;
}) {
  const { data, isLoading, isFetching, error, refetch } = usePaginatedSingleCol({
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
      <div className="flex flex-col gap-2 max-h-[344px] overflow-y-auto">
        {isLoading ? (
          <Skeleton />
        ) : error ? (
          <div className="py-6 flex-1 flex flex-col items-center justify-center gap-3 transition-all">
            <AlertCircle className="text-amber-400 w-8 h-8" />
            <div className="text-center">
              <div className="text-neutral-100 font-medium mb-1">Failed to load data</div>
              <div className="text-sm text-neutral-400 max-w-md mx-auto mb-3">
                {error.message || "An error occurred while fetching data"}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent hover:bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-neutral-100"
              onClick={() => refetch()}
            >
              <RefreshCcw className="w-3 h-3" /> Try Again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 overflow-x-hidden">
            <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-400">
              <div className="flex flex-row gap-1 items-center">
                {title}
                {IS_CLOUD && ["Countries", "Regions", "Cities"].includes(title) && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Geolocation by{" "}
                      <Link
                        href="https://ipapi.is/"
                        target="_blank"
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        ipapi.is
                      </Link>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div>{countLabel || "Sessions"}</div>
            </div>
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
              <div className="text-neutral-300 w-full text-center mt-6 flex flex-row gap-2 items-center justify-center">
                <Info className="w-5 h-5" />
                No Data
              </div>
            )}
          </div>
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
