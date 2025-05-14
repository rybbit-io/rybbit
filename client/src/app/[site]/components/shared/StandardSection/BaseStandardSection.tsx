import { Button } from "@/components/ui/button";
import NumberFlow from "@number-flow/react";
import { round } from "lodash";
import {
  AlertCircle,
  Info,
  RefreshCcw,
  SquareArrowOutUpRight,
} from "lucide-react";
import { ReactNode } from "react";
import { SingleColResponse } from "../../../../../api/analytics/useSingleCol";
import {
  addFilter,
  FilterParameter,
  removeFilter,
  useStore,
} from "../../../../../lib/store";
import { BaseStandardSectionDialog } from "./BaseStandardSectionDialog";
import { Skeleton } from "./Skeleton";

export const Row = ({
  e,
  ratio,
  getKey,
  getLabel,
  getValue,
  getLink,
  filterParameter,
}: {
  e: SingleColResponse;
  ratio: number;
  getKey: (item: SingleColResponse) => string;
  getLabel: (item: SingleColResponse) => ReactNode;
  getValue: (item: SingleColResponse) => string;
  getLink?: (item: SingleColResponse) => string;
  filterParameter: FilterParameter;
}) => {
  const filters = useStore((state) => state.filters);

  return (
    <div
      key={getKey(e)}
      className="relative h-6 flex items-center cursor-pointer hover:bg-neutral-850 group"
      onClick={() => {
        const foundFilter = filters.find(
          (f) =>
            f.parameter === filterParameter &&
            f.value.some((v) => v === getValue(e))
        );
        if (foundFilter) {
          removeFilter(foundFilter);
        } else {
          addFilter({
            parameter: filterParameter,
            value: [getValue(e)],
            type: "equals",
          });
        }
      }}
    >
      <div
        className="absolute inset-0 bg-dataviz py-2 opacity-25 rounded-md"
        style={{ width: `${e.percentage * ratio}%` }}
      ></div>
      <div className="z-10 mx-2 flex justify-between items-center text-xs w-full">
        <div className="flex items-center gap-1">
          {getLabel(e)}
          {getLink && (
            <a
              href={getLink(e)}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              <SquareArrowOutUpRight
                className="w-3 h-3 text-neutral-300 hover:text-neutral-100"
                strokeWidth={3}
              />
            </a>
          )}
        </div>
        <div className="text-xs flex gap-2">
          <div className="hidden group-hover:block text-neutral-400">
            {round(e.percentage, 1)}%
          </div>
          <NumberFlow
            respectMotionPreference={false}
            value={e.count}
            format={{ notation: "compact" }}
          />
        </div>
      </div>
    </div>
  );
};

interface BaseStandardSectionProps {
  title: string;
  data: { data?: SingleColResponse[] } | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  getKey: (item: SingleColResponse) => string;
  getLabel: (item: SingleColResponse) => ReactNode;
  getFilterLabel?: (item: SingleColResponse) => string;
  getValue: (item: SingleColResponse) => string;
  getLink?: (item: SingleColResponse) => string;
  countLabel?: string;
  filterParameter: FilterParameter;
  expanded: boolean;
  close: () => void;
}

export function BaseStandardSection({
  title,
  data,
  isLoading,
  error,
  refetch,
  getKey,
  getLabel,
  getFilterLabel,
  getValue,
  getLink,
  countLabel,
  filterParameter,
  expanded,
  close,
}: BaseStandardSectionProps) {
  const ratio = data?.data?.[0]?.percentage
    ? 100 / data?.data?.[0]?.percentage
    : 1;

  const hasError = error;
  const errorMessage =
    error?.message || "An error occurred while fetching data";

  return (
    <div className="flex flex-col gap-2">
      {isLoading ? (
        <Skeleton />
      ) : hasError ? (
        <div className="py-6 flex-1 flex flex-col items-center justify-center gap-3 transition-all">
          <AlertCircle className="text-amber-400 w-8 h-8" />
          <div className="text-center">
            <div className="text-neutral-100 font-medium mb-1">
              Failed to load data
            </div>
            <div className="text-sm text-neutral-400 max-w-md mx-auto mb-3">
              {errorMessage}
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
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-400">
            <div>{title}</div>
            <div>{countLabel || "Sessions"}</div>
          </div>
          {data?.data?.length ? (
            data?.data
              ?.slice(0, 10)
              .map((e) => (
                <Row
                  key={getKey(e)}
                  e={e}
                  ratio={ratio}
                  getKey={getKey}
                  getLabel={getLabel}
                  getValue={getValue}
                  getLink={getLink}
                  filterParameter={filterParameter}
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
      {!isLoading && !hasError && data?.data?.length ? (
        <div className="flex flex-row gap-2 justify-between items-center">
          <BaseStandardSectionDialog
            title={title}
            data={data.data}
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
  );
}
