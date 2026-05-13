"use client";

import { Filter } from "@rybbit/shared";
import { HelpCircle, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { useMetric } from "../../../../../api/analytics/hooks/useGetMetric";
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
import { cn, getCountryName, getLanguageName } from "../../../../../lib/utils";
import { isNumericParameter } from "./const";
import { validateRegex } from "./labels";

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
      <li>
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"^/products/[0-9]+$"}</code>
        <span className="text-neutral-500 ml-1">— {t("Product pages with numeric IDs")}</span>
      </li>
      <li>
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"(?i)newsletter"}</code>
        <span className="text-neutral-500 ml-1">— {t("Case-insensitive match for 'newsletter'")}</span>
      </li>
      <li>
        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{"^(?!.*test).*$"}</code>
        <span className="text-neutral-500 ml-1">— {t("Paths NOT containing 'test'")}</span>
      </li>
    </ul>
  );
}

export function ValuePopover({
  filter,
  onUpdate,
  children,
}: {
  filter: Filter;
  onUpdate: (filter: Filter) => void;
  children: React.ReactNode;
}) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const { getRegionName } = useGetRegionName();

  const isNumeric = isNumericParameter(filter.parameter);
  const isRegex = filter.type === "regex" || filter.type === "not_regex";
  const isNumericComparison =
    filter.type === "greater_than" ||
    filter.type === "less_than" ||
    filter.type === "greater_than_or_equal" ||
    filter.type === "less_than_or_equal";
  const needsTextInput = isNumeric || isRegex || isNumericComparison;

  const { data, isFetching } = useMetric({
    parameter: filter.parameter,
    limit: 1000,
    useFilters: false,
  });

  const getValueLabel = (val: string | number) => {
    if (filter.parameter === "country") return getCountryName(val as string);
    if (filter.parameter === "region") return getRegionName(val as string) ?? String(val);
    if (filter.parameter === "language") return getLanguageName(val as string);
    return String(val);
  };

  const suggestions = useMemo(() => {
    const fromData =
      data?.data?.flatMap(item => {
        const val = item.value;
        return val ? [{ value: String(val), label: String(getValueLabel(val)) }] : [];
      }) ?? [];
    const present = new Set(fromData.map(o => o.value));
    const selectedExtras = filter.value
      .map(v => String(v))
      .filter(v => !present.has(v))
      .map(v => ({ value: v, label: String(getValueLabel(v)) }));
    return [...selectedExtras, ...fromData];
  }, [data, filter.parameter, filter.value, getRegionName]);

  const toggleValue = (val: string) => {
    const exists = filter.value.some(v => String(v) === val);
    const newValue = exists ? filter.value.filter(v => String(v) !== val) : [...filter.value, val];
    onUpdate({ ...filter, value: newValue });
  };

  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();
  const matchesExisting = suggestions.some(o => o.label.toLowerCase() === trimmedSearch.toLowerCase());
  const canCreate = trimmedSearch.length > 0 && !matchesExisting;
  const addCustomValue = () => {
    if (!canCreate) return;
    const exists = filter.value.some(v => String(v) === trimmedSearch);
    if (!exists) {
      onUpdate({ ...filter, value: [...filter.value, trimmedSearch] });
    }
    setSearch("");
  };

  const [textInput, setTextInput] = useState(String(filter.value[0] ?? ""));
  const regexError = useMemo(() => (isRegex ? validateRegex(textInput) : null), [isRegex, textInput]);

  const commitTextInput = () => {
    if (textInput === "") {
      onUpdate({ ...filter, value: [] });
      return;
    }
    if (isNumeric || isNumericComparison) {
      const num = Number(textInput);
      onUpdate({ ...filter, value: Number.isFinite(num) ? [num] : [] });
      return;
    }
    onUpdate({ ...filter, value: [textInput] });
  };

  return (
    <Popover
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen && needsTextInput) commitTextInput();
        if (isOpen && needsTextInput) setTextInput(String(filter.value[0] ?? ""));
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {needsTextInput ? (
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTextInput();
                    setOpen(false);
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
                  const isSelected = filter.value.some(v => String(v) === option.value);
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
        )}
      </PopoverContent>
    </Popover>
  );
}
