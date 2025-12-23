import { FilterParameter, FilterType } from "@rybbit/shared";
import { X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useGetRegionName } from "../../../../../lib/geo";
import { removeFilter, updateFilter, useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import { isNumericParameter } from "./const";
import { filterTypeToLabel, getParameterNameLabel, getParameterValueLabel } from "./utils";

export function Filters({ availableFilters }: { availableFilters?: FilterParameter[] }) {
  const { filters } = useStore();
  const { getRegionName } = useGetRegionName();

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter, i) => {
        const disabled = availableFilters && !availableFilters.includes(filter.parameter);

        return (
          <Tooltip key={filter.parameter}>
            {disabled && (
              <TooltipContent>
                <p>Filter not active for this page</p>
              </TooltipContent>
            )}
            <TooltipTrigger>
              <div
                key={filter.parameter}
                className={cn(
                  "px-2 py-1 rounded-lg text-neutral-500 dark:text-neutral-400 flex items-center gap-1 text-sm",
                  disabled ? "bg-neutral-200 dark:bg-neutral-900" : "bg-neutral-100 dark:bg-neutral-850"
                )}
              >
                <div
                  className={cn(
                    disabled ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-600 dark:text-neutral-300"
                  )}
                >
                  {getParameterNameLabel(filter.parameter)}
                </div>
                <div
                  className={cn(
                    "text-emerald-400 font cursor-pointer whitespace-nowrap",
                    (filter.type === "not_equals" || filter.type === "not_contains" || filter.type === "not_regex") &&
                      "text-red-400"
                  )}
                  onClick={() => {
                    const isNumeric = isNumericParameter(filter.parameter);
                    let newType: FilterType = "equals";

                    if (isNumeric) {
                      // Numeric cycle: equals -> not_equals -> greater_than -> less_than -> equals
                      if (filter.type === "equals") {
                        newType = "not_equals";
                      } else if (filter.type === "not_equals") {
                        newType = "greater_than";
                      } else if (filter.type === "greater_than") {
                        newType = "less_than";
                      } else if (filter.type === "less_than") {
                        newType = "equals";
                      }
                    } else {
                      // String cycle: equals -> not_equals -> contains -> not_contains -> regex -> not_regex -> equals
                      if (filter.type === "equals") {
                        newType = "not_equals";
                      } else if (filter.type === "not_equals") {
                        newType = "contains";
                      } else if (filter.type === "contains") {
                        newType = "not_contains";
                      } else if (filter.type === "not_contains") {
                        newType = "regex";
                      } else if (filter.type === "regex") {
                        newType = "not_regex";
                      } else if (filter.type === "not_regex") {
                        newType = "equals";
                      }
                    }

                    updateFilter({ ...filter, type: newType }, i);
                  }}
                >
                  {filterTypeToLabel(filter.type)}
                </div>
                <div
                  className={cn(
                    "text-neutral-900 dark:text-neutral-100 font-medium whitespace-nowrap",
                    disabled && "text-neutral-400 dark:text-neutral-500"
                  )}
                >
                  {getParameterValueLabel(filter, getRegionName)}
                </div>
                <div
                  className="text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200"
                  onClick={() => removeFilter(filter)}
                >
                  <X size={16} strokeWidth={3} />
                </div>
              </div>
            </TooltipTrigger>
          </Tooltip>
        );
      })}
    </div>
  );
}
