"use client";

import { Filter, FilterParameter, FilterType } from "@rybbit/shared";
import { useExtracted } from "next-intl";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../components/ui/popover";
import { FilterOptions, isNumericParameter } from "./const";
import { useParameterLabel } from "./labels";

export function ParameterPopover({
  filter,
  onUpdate,
  availableFilters,
  children,
}: {
  filter: Filter;
  onUpdate: (filter: Filter) => void;
  availableFilters?: FilterParameter[];
  children: React.ReactNode;
}) {
  const t = useExtracted();
  const getParameterLabel = useParameterLabel();

  const [open, setOpen] = useState(false);

  const options = availableFilters
    ? FilterOptions.filter(o => availableFilters.includes(o.value))
    : FilterOptions;

  const handleSelect = (newParam: FilterParameter) => {
    const newIsNumeric = isNumericParameter(newParam);
    const stringOnly: FilterType[] = [
      "contains",
      "not_contains",
      "starts_with",
      "ends_with",
      "regex",
      "not_regex",
    ];
    const numericOnly: FilterType[] = [
      "greater_than",
      "less_than",
      "greater_than_or_equal",
      "less_than_or_equal",
    ];
    let newType = filter.type;
    if (newIsNumeric && stringOnly.includes(filter.type)) {
      newType = "equals";
    } else if (!newIsNumeric && numericOnly.includes(filter.type)) {
      newType = "equals";
    }
    onUpdate({ ...filter, parameter: newParam, type: newType, value: [] });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("Search")} />
          <CommandList>
            <CommandEmpty>{t("No results")}</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={getParameterLabel(option.value)}
                  onSelect={() => handleSelect(option.value)}
                >
                  <div className="flex items-center gap-2">
                    {option.icon}
                    {getParameterLabel(option.value)}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
