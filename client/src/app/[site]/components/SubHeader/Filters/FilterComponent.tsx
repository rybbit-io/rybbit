"use client";

import { Filter, FilterParameter } from "@rybbit/shared";
import { Trash } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "../../../../../components/ui/button";
import { useGetRegionName } from "../../../../../lib/geo";
import { cn } from "../../../../../lib/utils";
import { isNumericParameter } from "./const";
import {
  formatDisplayValue,
  getParameterIcon,
  operatorNeedsValue,
  useOperatorLabel,
  useParameterLabel
} from "./labels";
import { OperatorPopover } from "./OperatorPopover";
import { ParameterPopover } from "./ParameterPopover";
import { ValuePopover } from "./ValuePopover";

export function FilterComponent({
  filter,
  index,
  updateFilter,
  availableFilters,
}: {
  filter: Filter;
  index: number;
  updateFilter: (filter: Filter | null, index: number) => void;
  availableFilters?: FilterParameter[];
}) {
  const t = useExtracted();
  const { getRegionName } = useGetRegionName();

  const getParameterLabel = useParameterLabel();
  const getOperatorLabel = useOperatorLabel();

  const onUpdate = (next: Filter) => updateFilter(next, index);

  const isNumeric = isNumericParameter(filter.parameter);
  const displayValue = formatDisplayValue(filter, getRegionName);
  const hasValue = filter.value.length > 0;
  const isNegated =
    filter.type === "not_equals" ||
    filter.type === "not_contains" ||
    filter.type === "not_regex";

  return (
    <div className="grid grid-cols-[120px_90px_250px_auto] gap-2">
      <ParameterPopover filter={filter} onUpdate={onUpdate} availableFilters={availableFilters}>
        <Button
          variant="outline"
          size="sm"
          className="font-normal justify-start text-neutral-700 dark:text-neutral-200"
        >
          {getParameterIcon(filter.parameter)}
          {getParameterLabel(filter.parameter)}
        </Button>
      </ParameterPopover>
      <OperatorPopover filter={filter} onUpdate={onUpdate}>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "font-normal justify-start text-neutral-500 dark:text-neutral-400"
          )}
        >
          {getOperatorLabel(filter.type, isNumeric)}
        </Button>
      </OperatorPopover>
      {operatorNeedsValue(filter.type) ? (
        <ValuePopover filter={filter} onUpdate={onUpdate}>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start truncate",
              hasValue
                ? "text-neutral-900 dark:text-neutral-100 font-medium"
                : "text-neutral-500 dark:text-neutral-400 italic font-normal"
            )}
          >
            <span className="truncate">{hasValue ? displayValue : t("pick value")}</span>
          </Button>
        </ValuePopover>
      ) : (
        <div />
      )}
      <Button variant="ghost" className="h-8 w-8" onClick={() => updateFilter(null, index)}>
        <Trash className="w-4 h-4" />
      </Button>
    </div>
  );
}
