"use client";

import { FilterParameter } from "@rybbit/shared";
import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "../../../../../components/ui/button";
import { ButtonGroup } from "../../../../../components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useGetRegionName } from "../../../../../lib/geo";
import { removeFilter, updateFilter, useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import { isNumericParameter } from "./const";
import {
  formatDisplayValue,
  getParameterIcon,
  useParameterLabel,
  operatorNeedsValue,
  useOperatorLabel,
} from "./labels";
import { OperatorPopover } from "./OperatorPopover";
import { ParameterPopover } from "./ParameterPopover";
import { ValuePopover } from "./ValuePopover";

export function Filters({ availableFilters }: { availableFilters?: FilterParameter[] }) {
  const t = useExtracted();
  const { filters } = useStore();
  const { getRegionName } = useGetRegionName();
  const getParameterLabel = useParameterLabel();
  const getOperatorLabel = useOperatorLabel();

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter, i) => {
        const disabled = availableFilters && !availableFilters.includes(filter.parameter);
        const isNumeric = isNumericParameter(filter.parameter);
        const displayValue = formatDisplayValue(filter, getRegionName);
        const hasValue = filter.value.length > 0;
        const isNegated =
          filter.type === "not_equals" ||
          filter.type === "not_contains" ||
          filter.type === "not_regex";

        const onUpdate = (next: typeof filter) => updateFilter(next, i);

        const pill = (
          <ButtonGroup>
            <ParameterPopover filter={filter} onUpdate={onUpdate} availableFilters={availableFilters}>
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                className={cn(
                  "font-normal py-1.5 px-2 gap-1.5",
                  disabled
                    ? "text-neutral-400 dark:text-neutral-500"
                    : "text-neutral-700 dark:text-neutral-100"
                )}
              >
                {getParameterIcon(filter.parameter)}
                {getParameterLabel(filter.parameter)}
              </Button>
            </ParameterPopover>
            <OperatorPopover filter={filter} onUpdate={onUpdate}>
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                className={cn("font-normal p-1.5 text-neutral-500 dark:text-neutral-400")}
              >
                {getOperatorLabel(filter.type, isNumeric)}
              </Button>
            </OperatorPopover>
            {operatorNeedsValue(filter.type) && (
              <ValuePopover filter={filter} onUpdate={onUpdate}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  className={cn(
                    "max-w-[260px] truncate py-1.5 px-2",
                    hasValue
                      ? "text-neutral-900 dark:text-neutral-100 font-medium"
                      : "text-neutral-500 dark:text-neutral-400 italic font-normal",
                    disabled && "text-neutral-400 dark:text-neutral-500"
                  )}
                >
                  <span className="truncate">{hasValue ? displayValue : t("pick value")}</span>
                </Button>
              </ValuePopover>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="text-neutral-500 dark:text-neutral-400 px-1.5"
              onClick={() => removeFilter(filter)}
              aria-label={t("Remove filter")}
            >
              <X size={14} strokeWidth={2.5} />
            </Button>
          </ButtonGroup>
        );

        if (disabled) {
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>{pill}</TooltipTrigger>
              <TooltipContent>
                <p>{t("Filter not active for this page")}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return <div key={i}>{pill}</div>;
      })}
    </div>
  );
}
