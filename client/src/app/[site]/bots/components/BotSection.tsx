"use client";

import { FilterParameter } from "@rybbit/shared";
import NumberFlow from "@number-flow/react";
import { Info, SquareArrowOutUpRight } from "lucide-react";
import { ReactNode, useCallback } from "react";
import { type BotDimensionItem, type BotDimensionKey } from "../../../../api/analytics/endpoints";
import { useGetBotDimension } from "../../../../api/analytics/hooks/bots/useGetBotDimension";
import { ErrorState } from "../../../../components/ErrorState";
import { CardLoader } from "../../../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { addFilter, removeFilter, useStore } from "../../../../lib/store";
import { cn } from "../../../../lib/utils";
import { StandardSkeleton } from "../../components/shared/StandardSection/Skeleton";

function useFilterToggle() {
  const filters = useStore(state => state.filters);

  return useCallback(
    (parameter: FilterParameter, value: string) => {
      if (!value) return;
      const foundFilter = filters.find(filter => filter.parameter === parameter && filter.value.some(v => v === value));
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
}

function BotRow({
  item,
  ratio,
  filterParameter,
  getKey,
  getLabel,
  getValue,
  getLink,
}: {
  item: BotDimensionItem;
  ratio: number;
  filterParameter?: FilterParameter;
  getKey: (item: BotDimensionItem) => string;
  getLabel: (item: BotDimensionItem) => ReactNode;
  getValue: (item: BotDimensionItem) => string;
  getLink?: (item: BotDimensionItem) => string | undefined;
}) {
  const toggleFilter = useFilterToggle();
  const value = getValue(item);
  const link = getLink?.(item);

  return (
    <div
      key={getKey(item)}
      className={cn(
        "relative h-6 flex items-center hover:bg-neutral-150/50 dark:hover:bg-neutral-850 group",
        value && filterParameter && "cursor-pointer"
      )}
      onClick={() => filterParameter && toggleFilter(filterParameter, value)}
    >
      <div
        className="absolute inset-0 bg-dataviz py-2 opacity-25 rounded-md"
        style={{ width: `${item.percentage * ratio}%` }}
      />
      <div className="z-10 mx-2 flex justify-between items-center text-xs w-full gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="truncate">{getLabel(item)}</span>
          {link && (
            <a
              href={link}
              rel="noopener noreferrer"
              target="_blank"
              onClick={e => e.stopPropagation()}
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
            {item.percentage.toFixed(1)}%
          </div>
          <NumberFlow respectMotionPreference={false} value={item.count} format={{ notation: "compact" }} />
        </div>
      </div>
    </div>
  );
}

function BotRows({
  items,
  ratio,
  filterParameter,
  getKey,
  getLabel,
  getValue,
  getLink,
}: {
  items: BotDimensionItem[];
  ratio: number;
  filterParameter?: FilterParameter;
  getKey: (item: BotDimensionItem) => string;
  getLabel: (item: BotDimensionItem) => ReactNode;
  getValue: (item: BotDimensionItem) => string;
  getLink?: (item: BotDimensionItem) => string | undefined;
}) {
  return (
    <div className="flex flex-col gap-2 overflow-x-hidden">
      {items.map(item => (
        <BotRow
          key={getKey(item)}
          item={item}
          ratio={ratio}
          filterParameter={filterParameter}
          getKey={getKey}
          getLabel={getLabel}
          getValue={getValue}
          getLink={getLink}
        />
      ))}
    </div>
  );
}

function useBotSectionData(dimension: BotDimensionKey) {
  const { site } = useStore();
  const { data, isLoading, isFetching, error, refetch } = useGetBotDimension({
    site,
    dimension,
    limit: 100,
    page: 1,
  });

  const items =
    data?.data?.data.map(item => ({
      ...item,
      value: item.value == null ? "" : String(item.value),
      hostname: item.hostname == null ? undefined : String(item.hostname),
    })) ?? [];
  const ratio = items[0]?.percentage ? 100 / items[0].percentage : 1;

  return { items, ratio, isLoading, isFetching, error, refetch };
}

function EmptyBotSection() {
  return (
    <div className="text-neutral-600 dark:text-neutral-300 w-full text-center mt-6 flex flex-row gap-2 items-center justify-center">
      <Info className="w-5 h-5" />
      No Data
    </div>
  );
}

export type BotSectionBaseProps = {
  title: string;
  dimension: BotDimensionKey;
  getKey: (item: BotDimensionItem) => string;
  getLabel: (item: BotDimensionItem) => ReactNode;
  getValue: (item: BotDimensionItem) => string;
  getLink?: (item: BotDimensionItem) => string | undefined;
  filterable?: boolean;
};

type BotSectionProps = BotSectionBaseProps & {
  expanded?: boolean;
  close?: () => void;
  renderDialog?: boolean;
};

export function BotSectionDialogBody({
  dimension,
  getKey,
  getLabel,
  getValue,
  getLink,
  filterable = true,
}: BotSectionBaseProps) {
  const { items, ratio, isLoading, error, refetch } = useBotSectionData(dimension);
  const filterParameter = filterable ? (dimension as FilterParameter) : undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <StandardSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Failed to load data" message={error.message} refetch={refetch} />;
  }

  if (!items.length) {
    return <EmptyBotSection />;
  }

  return (
    <ScrollArea className="h-full min-h-0 pr-3">
      <BotRows
        items={items}
        ratio={ratio}
        filterParameter={filterParameter}
        getKey={getKey}
        getLabel={getLabel}
        getValue={getValue}
        getLink={getLink}
      />
    </ScrollArea>
  );
}

export function BotSection({
  title,
  dimension,
  getKey,
  getLabel,
  getValue,
  getLink,
  expanded,
  close,
  filterable = true,
  renderDialog = true,
}: BotSectionProps) {
  const { items, ratio, isLoading, isFetching, error, refetch } = useBotSectionData(dimension);
  const filterParameter = filterable ? (dimension as FilterParameter) : undefined;

  const content = (
    <BotRows
      items={items}
      ratio={ratio}
      filterParameter={filterParameter}
      getKey={getKey}
      getLabel={getLabel}
      getValue={getValue}
      getLink={getLink}
    />
  );

  return (
    <>
      {isFetching && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <div className="flex flex-row gap-2 justify-between pr-1 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
        <div>{title}</div>
        <div>Requests</div>
      </div>
      <ScrollArea className="h-[314px]">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <StandardSkeleton />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load data" message={error.message} refetch={refetch} />
        ) : items.length ? (
          content
        ) : (
          <EmptyBotSection />
        )}
      </ScrollArea>
      {renderDialog && close && (
        <Dialog open={expanded} onOpenChange={open => !open && close()}>
          <DialogContent className="max-w-3xl h-[calc(100vh-2rem)] flex flex-col">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1">
              <BotSectionDialogBody
                title={title}
                dimension={dimension}
                getKey={getKey}
                getLabel={getLabel}
                getValue={getValue}
                getLink={getLink}
                filterable={filterable}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
