"use client";

import { Filter, FilterParameter, FilterType } from "@rybbit/shared";
import { ChevronLeft, ChevronRight, ChevronsUpDown, HelpCircle, ListFilterPlus, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { useMetric } from "../../../../../api/analytics/hooks/useGetMetric";
import { Button } from "../../../../../components/ui/button";
import { Checkbox } from "../../../../../components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../../components/ui/command";
import { Input } from "../../../../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useGetRegionName } from "../../../../../lib/geo";
import { addFilter } from "../../../../../lib/store";
import { cn, getCountryName, getLanguageName } from "../../../../../lib/utils";
import {
  FilterOptions,
  isNumericParameter,
  NumericOperatorOptions,
  StringOperatorOptions,
} from "./const";
import { useOperatorLabel, useOperatorMenuLabel, useParameterLabel, validateRegex } from "./labels";

function RegexExamples() {
  const t = useExtracted();
  return (
    <ul className="text-xs space-y-1">
      <li>
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"^/blog/"}</code>
        <span className="text-neutral-500 ml-1">— {t("Paths starting with /blog/")}</span>
      </li>
      <li>
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"/blog/.*"}</code>
        <span className="text-neutral-500 ml-1">
          — {t("Paths containing /blog/ followed by anything")}
        </span>
      </li>
      <li>
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"\\.(pdf|doc|docx)$"}</code>
        <span className="text-neutral-500 ml-1">— {t("Paths ending in .pdf, .doc, or .docx")}</span>
      </li>
    </ul>
  );
}

function ValueStep({
  parameter,
  onCommit,
  onBack,
  onClose,
  pendingRef,
}: {
  parameter: FilterParameter;
  onCommit: (filter: Filter) => void;
  onBack: () => void;
  onClose: () => void;
  pendingRef: React.MutableRefObject<() => Filter | null>;
}) {
  const t = useExtracted();
  const { getRegionName } = useGetRegionName();
  const [type, setType] = useState<FilterType>("equals");
  const [selected, setSelected] = useState<(string | number)[]>([]);
  const [textInput, setTextInput] = useState("");
  const [search, setSearch] = useState("");
  const [operatorOpen, setOperatorOpen] = useState(false);

  const getParameterLabel = useParameterLabel();
  const getOperatorLabel = useOperatorLabel();
  const getOperatorMenuLabel = useOperatorMenuLabel();

  const isNumeric = isNumericParameter(parameter);
  const isRegex = type === "regex" || type === "not_regex";
  const isNumericComparison =
    type === "greater_than" ||
    type === "less_than" ||
    type === "greater_than_or_equal" ||
    type === "less_than_or_equal";
  const needsValue = type !== "is_null" && type !== "is_not_null";
  const needsTextInput = isNumeric || isRegex || isNumericComparison;
  const operatorOptions = isNumeric ? NumericOperatorOptions : StringOperatorOptions;

  const { data, isFetching } = useMetric({
    parameter,
    limit: 1000,
    useFilters: false,
  });

  const getValueLabel = (val: string | number) => {
    if (parameter === "country") return getCountryName(val as string);
    if (parameter === "region") return getRegionName(val as string) ?? String(val);
    if (parameter === "language") return getLanguageName(val as string);
    return String(val);
  };

  const suggestions = useMemo(() => {
    const fromData =
      data?.data
        ?.map(item => item.value)
        .filter(Boolean)
        .map(val => ({ value: String(val), label: String(getValueLabel(val)) })) ?? [];
    const present = new Set(fromData.map(o => o.value));
    const selectedExtras = selected
      .map(v => String(v))
      .filter(v => !present.has(v))
      .map(v => ({ value: v, label: String(getValueLabel(v)) }));
    return [...selectedExtras, ...fromData];
  }, [data, parameter, selected, getRegionName]);

  const trimmedSearch = search.trim();
  const matchesExisting = suggestions.some(
    o => o.label.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const canCreate = trimmedSearch.length > 0 && !matchesExisting;

  const toggleValue = (val: string) => {
    const exists = selected.some(v => String(v) === val);
    setSelected(exists ? selected.filter(v => String(v) !== val) : [...selected, val]);
  };

  const addCustomValue = () => {
    if (!canCreate) return;
    const exists = selected.some(v => String(v) === trimmedSearch);
    if (!exists) setSelected([...selected, trimmedSearch]);
    setSearch("");
  };

  const regexError = useMemo(() => (isRegex ? validateRegex(textInput) : null), [isRegex, textInput]);

  const buildFilter = (): Filter | null => {
    if (type === "is_null" || type === "is_not_null") {
      return { parameter, type, value: [] };
    }
    if (needsTextInput) {
      if (textInput.trim() === "") return null;
      if (isNumeric || isNumericComparison) {
        const num = Number(textInput);
        if (!Number.isFinite(num)) return null;
        return { parameter, type, value: [num] };
      }
      if (isRegex && validateRegex(textInput)) return null;
      return { parameter, type, value: [textInput.trim()] };
    }
    if (selected.length === 0) return null;
    return { parameter, type, value: selected };
  };

  pendingRef.current = buildFilter;

  const commitAndClose = () => {
    const f = buildFilter();
    if (f) onCommit(f);
    onClose();
  };

  const selectOperator = (next: FilterType) => {
    setOperatorOpen(false);
    if (next === "is_null" || next === "is_not_null") {
      onCommit({ parameter, type: next, value: [] });
      onClose();
      return;
    }
    setType(next);
    setSelected([]);
    setTextInput("");
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-2 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-neutral-50 px-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {getParameterLabel(parameter)}
        </button>
        <Popover open={operatorOpen} onOpenChange={setOperatorOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 px-2 py-1 rounded"
            >
              {getOperatorLabel(type, isNumeric)}
              <ChevronsUpDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="end">
            <div className="px-3 pt-3 pb-1 text-sm font-medium">{t("Operator")}</div>
            <div className="flex flex-col py-1">
              {operatorOptions.map(option => {
                const isSelected = option.value === type;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectOperator(option.value as FilterType)}
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
      </div>
      {needsValue && (
        needsTextInput ? (
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitAndClose();
                  }
                }}
                placeholder={isRegex ? t("e.g. ^/blog/.*") : t("Enter value...")}
                className={cn("h-9", regexError && "border-red-500 focus-visible:ring-red-500")}
                type={isNumeric || isNumericComparison ? "number" : "text"}
              />
              {isRegex && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-300"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-medium">{t("Regex Examples:")}</p>
                      <RegexExamples />
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {regexError && <div className="text-xs text-red-500 truncate">{regexError}</div>}
          </div>
        ) : (
          <Command>
            <CommandInput
              placeholder={t("Search or add value")}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{isFetching ? t("Loading...") : t("No results")}</CommandEmpty>
              {canCreate && (
                <CommandGroup>
                  <CommandItem
                    value={`__create__${trimmedSearch}`}
                    onSelect={addCustomValue}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {t("Add")} &quot;{trimmedSearch}&quot;
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup>
                {suggestions.map(option => {
                  const isSelected = selected.some(v => String(v) === option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => toggleValue(option.value)}
                      className="cursor-pointer"
                    >
                      <Checkbox checked={isSelected} className="mr-2" />
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        )
      )}
    </div>
  );
}

export function NewFilterButton({ availableFilters }: { availableFilters?: FilterParameter[] }) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [parameter, setParameter] = useState<FilterParameter | null>(null);
  const pendingRef = useRef<() => Filter | null>(() => null);
  const getParameterLabel = useParameterLabel();

  const parameterOptions = availableFilters
    ? FilterOptions.filter(o => availableFilters.includes(o.value))
    : FilterOptions;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const f = pendingRef.current();
      if (f) addFilter(f);
      pendingRef.current = () => null;
      setParameter(null);
    }
    setOpen(isOpen);
  };

  const selectParameter = (param: FilterParameter) => {
    setParameter(param);
  };

  const goBackToParameter = () => {
    pendingRef.current = () => null;
    setParameter(null);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <ListFilterPlus className="w-4 h-4" />
          {t("Filter")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {parameter ? (
          <ValueStep
            key={parameter}
            parameter={parameter}
            pendingRef={pendingRef}
            onCommit={f => addFilter(f)}
            onBack={goBackToParameter}
            onClose={() => {
              pendingRef.current = () => null;
              setParameter(null);
              setOpen(false);
            }}
          />
        ) : (
          <Command>
            <div className="px-3 pt-3 pb-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t("Filter stats by")}
            </div>
            <CommandInput placeholder={t("Search")} />
            <CommandList>
              <CommandEmpty>{t("No results")}</CommandEmpty>
              <CommandGroup>
                {parameterOptions.map(option => (
                  <CommandItem
                    key={option.value}
                    value={getParameterLabel(option.value)}
                    onSelect={() => selectParameter(option.value)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {option.icon}
                      <span className="truncate">{getParameterLabel(option.value)}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
