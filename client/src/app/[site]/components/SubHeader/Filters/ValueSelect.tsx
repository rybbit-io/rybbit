"use client";

import { FilterParameter } from "@rybbit/shared";
import { useMemo } from "react";
import { useMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { MultiSelect } from "../../../../../components/MultiSelect";
import { useGetRegionName } from "../../../../../lib/geo";
import { getCountryName, getLanguageName } from "../../../../../lib/utils";

export function ValueSelect({
  parameter,
  value,
  onChange,
}: {
  parameter: FilterParameter;
  value: (string | number)[];
  onChange: (values: (string | number)[]) => void;
}) {
  const { data, isFetching } = useMetric({
    parameter,
    limit: 1000,
    useFilters: false,
  });

  const { getRegionName } = useGetRegionName();

  const getValueLabel = (val: string | number) => {
    if (parameter === "country") {
      return getCountryName(val as string);
    }
    if (parameter === "region") {
      return getRegionName(val as string);
    }
    if (parameter === "language") {
      return getLanguageName(val as string);
    }
    return val;
  };

  const suggestions = useMemo(() => {
    return (
      data?.data
        ?.map(item => item.value)
        .filter(Boolean)
        .map(val => ({
          value: val,
          label: getValueLabel(val),
        })) || []
    );
  }, [data, parameter, getRegionName]);

  const handleChange = (selected: any) => {
    const values = selected.map((item: { value: string }) => item.value);
    onChange(values);
  };

  return (
    <MultiSelect
      value={value.map(val => ({
        value: val,
        label: getValueLabel(val),
      }))}
      options={isFetching ? [] : suggestions}
      onChange={handleChange}
      placeholder="Select values..."
      isLoading={isFetching}
    />
  );
}
