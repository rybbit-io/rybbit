"use client";

import { Filter, FilterType } from "@rybbit/shared";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../components/ui/popover";
import { cn } from "../../../../../lib/utils";
import { isNumericParameter, NumericOperatorOptions, StringOperatorOptions } from "./const";
import { useOperatorMenuLabel } from "./labels";

export function OperatorPopover({
  filter,
  onUpdate,
  children,
}: {
  filter: Filter;
  onUpdate: (filter: Filter) => void;
  children: React.ReactNode;
}) {
  const t = useExtracted();
  const getOperatorMenuLabel = useOperatorMenuLabel();
  const [open, setOpen] = useState(false);
  const isNumeric = isNumericParameter(filter.parameter);
  const operatorOptions = isNumeric ? NumericOperatorOptions : StringOperatorOptions;

  const handleSelect = (newType: FilterType) => {
    onUpdate({ ...filter, type: newType, value: [] });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="px-3 pt-3 pb-1 text-sm font-medium">{t("Operator")}</div>
        <div className="flex flex-col py-1">
          {operatorOptions.map(option => {
            const isSelected = option.value === filter.type;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value as FilterType)}
                className={cn(
                  "text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  isSelected && "bg-neutral-100 dark:bg-neutral-800"
                )}
              >
                {getOperatorMenuLabel(option.value as FilterType, isNumeric)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
