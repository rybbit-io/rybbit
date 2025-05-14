"use client";

import { ReactNode, useMemo } from "react";
import {
  SingleColResponse,
  useSingleCol,
} from "../../../../../api/analytics/useSingleCol";
import { FilterParameter } from "../../../../../lib/store";
import { BaseStandardSection } from "./BaseStandardSection";
import { CardLoader } from "../../../../../components/ui/card";

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
}) {
  const { data, isLoading, isFetching, error, refetch } = useSingleCol({
    parameter: filterParameter,
  });

  // const {
  //   data: previousData,
  //   isLoading: previousIsLoading,
  //   isFetching: previousIsFetching,
  // } = useSingleCol({
  //   parameter: filterParameter,
  //   periodTime: "previous",
  // });

  // Create combined loading state
  const loading = isLoading;
  // const loading = isLoading || previousIsLoading;

  // For potential additional features that use previous data
  // const previousDataMap = useMemo(() => {
  //   return previousData?.data?.reduce((acc, curr) => {
  //     acc[getKey(curr)] = curr;
  //     return acc;
  //   }, {} as Record<string, SingleColResponse>);
  // }, [previousData, getKey]);

  return (
    <>
      {isFetching && (
        <div className="absolute top-[-8px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
      <BaseStandardSection
        title={title}
        data={data}
        isLoading={loading}
        error={error}
        refetch={refetch}
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
    </>
  );
}
