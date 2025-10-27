import { FilterParameter } from "@rybbit/shared";
import NumberFlow from "@number-flow/react";
import { round } from "lodash";
import { ChevronDown, ChevronRight, SquareArrowOutUpRight } from "lucide-react";
import { ReactNode, useState, useCallback } from "react";
import { usePaginatedSingleCol } from "../../../../../api/analytics/useSingleCol";
import { SingleColResponse } from "../../../../../api/analytics/useSingleCol";
import { addFilter, removeFilter, useStore } from "../../../../../lib/store";

// Custom hook for filter handling logic
const useFilterToggle = () => {
  const filters = useStore(state => state.filters);

  const toggleFilter = useCallback(
    (parameter: FilterParameter, value: string) => {
      const foundFilter = filters.find(f => f.parameter === parameter && f.value.some(v => v === value));
      if (foundFilter) {
        removeFilter(foundFilter);
      } else {
        addFilter({
          parameter,
          value: [value],
          type: "equals",
        });
      }
    },
    [filters]
  );

  return toggleFilter;
};

// Shared row item component
const RowItem = ({
  item,
  ratio,
  getKey,
  getLabel,
  getValue,
  getLink,
  filterParameter,
  onFilterToggle,
  leftContent,
}: {
  item: SingleColResponse;
  ratio: number;
  getKey: (item: SingleColResponse) => string;
  getLabel: (item: SingleColResponse) => ReactNode;
  getValue: (item: SingleColResponse) => string;
  getLink?: (item: SingleColResponse) => string;
  filterParameter: FilterParameter;
  onFilterToggle: (parameter: FilterParameter, value: string) => void;
  leftContent?: ReactNode;
}) => {
  return (
    <div
      key={getKey(item)}
      className="relative h-6 flex items-center cursor-pointer hover:bg-neutral-850 group"
      onClick={() => onFilterToggle(filterParameter, getValue(item))}
    >
      <div
        className="absolute inset-0 bg-dataviz py-2 opacity-25 rounded-md"
        style={{ width: `${item.percentage * ratio}%` }}
      ></div>
      <div className="z-10 mx-2 flex justify-between items-center text-xs w-full">
        <div className="flex items-center gap-1">
          {leftContent}
          {getLabel(item)}
          {getLink && (
            <a href={getLink(item)} target="_blank" onClick={e => e.stopPropagation()}>
              <SquareArrowOutUpRight
                className="ml-0.5 w-3.5 h-3.5 text-neutral-300 hover:text-neutral-100"
                strokeWidth={3}
              />
            </a>
          )}
        </div>
        <div className="text-xs flex gap-2">
          <div className="hidden group-hover:block text-neutral-400">{round(item.percentage, 1)}%</div>
          <NumberFlow respectMotionPreference={false} value={item.count} format={{ notation: "compact" }} />
        </div>
      </div>
    </div>
  );
};

const Subrows = ({
  getKey,
  getValue,
  getLink,
  filterParameter,
  filterValue,
  getSubrowLabel,
}: {
  getKey: (item: SingleColResponse) => string;
  getValue: (item: SingleColResponse) => string;
  getLink?: (item: SingleColResponse) => string;
  filterParameter: FilterParameter;
  filterValue: string;
  getSubrowLabel?: (item: SingleColResponse) => ReactNode;
}) => {
  const toggleFilter = useFilterToggle();
  const parameter = (filterParameter + "_version") as FilterParameter;

  const { data, isLoading, isFetching } = usePaginatedSingleCol({
    parameter,
    limit: 10,
    page: 1,
    additionalFilters: [
      {
        parameter: filterParameter,
        value: [filterValue],
        type: "equals",
      },
    ],
  });

  const itemsForDisplay = data?.data;

  const ratio = itemsForDisplay?.[0]?.percentage ? 100 / itemsForDisplay[0].percentage : 1;

  if (isLoading || isFetching) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 pl-5 pt-2">
      {itemsForDisplay?.map(e => (
        <RowItem
          key={getKey(e)}
          item={e}
          ratio={ratio}
          getKey={getKey}
          getLabel={getSubrowLabel || getValue}
          getValue={getValue}
          getLink={getLink}
          filterParameter={parameter}
          onFilterToggle={toggleFilter}
        />
      ))}
    </div>
  );
};

export const Row = ({
  e,
  ratio,
  getKey,
  getLabel,
  getValue,
  getLink,
  filterParameter,
  getSubrowLabel,
  hasSubrow,
}: {
  e: SingleColResponse;
  ratio: number;
  getKey: (item: SingleColResponse) => string;
  getLabel: (item: SingleColResponse) => ReactNode;
  getValue: (item: SingleColResponse) => string;
  getLink?: (item: SingleColResponse) => string;
  filterParameter: FilterParameter;
  getSubrowLabel?: (item: SingleColResponse) => ReactNode;
  hasSubrow?: boolean;
}) => {
  const toggleFilter = useFilterToggle();
  const [expanded, setExpanded] = useState(false);

  const Icon = expanded ? ChevronDown : ChevronRight;

  const expandIcon = hasSubrow ? (
    <Icon
      className="w-4 h-4 text-neutral-400 hover:text-neutral-100"
      strokeWidth={3}
      onClick={e => {
        e.stopPropagation();
        setExpanded(prev => !prev);
      }}
    />
  ) : null;

  return (
    <div className="flex flex-col">
      <RowItem
        item={e}
        ratio={ratio}
        getKey={getKey}
        getLabel={getLabel}
        getValue={getValue}
        getLink={getLink}
        filterParameter={filterParameter}
        onFilterToggle={toggleFilter}
        leftContent={expandIcon}
      />
      {hasSubrow && expanded && (
        <Subrows
          getKey={getKey}
          getValue={getValue}
          getLink={getLink}
          filterParameter={filterParameter}
          filterValue={getValue(e)}
          getSubrowLabel={getSubrowLabel}
        />
      )}
    </div>
  );
};
