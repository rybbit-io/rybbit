import { Filter, FilterParameter, FilterType } from "@rybbit/shared";
import { HelpCircle, Trash } from "lucide-react";
import { useMemo } from "react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { FilterOptions, StringOperatorOptions, NumericOperatorOptions, isNumericParameter } from "./const";
import { ValueSelect } from "./ValueSelect";
import { IS_CLOUD } from "../../../../../lib/const";

// Validate regex pattern and return error message if invalid
function validateRegex(pattern: string): string | null {
  if (!pattern) return null;

  try {
    new RegExp(pattern);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid regex pattern";
  }
}

const REGEX_EXAMPLES = [
  { pattern: "^/blog/", description: "Paths starting with /blog/" },
  { pattern: "/blog/.*", description: "Paths containing /blog/ followed by anything" },
  { pattern: "\\.(pdf|doc|docx)$", description: "Paths ending in .pdf, .doc, or .docx" },
  { pattern: "^/products/[0-9]+$", description: "Product pages with numeric IDs" },
  { pattern: "(?i)newsletter", description: "Case-insensitive match for 'newsletter'" },
  { pattern: "^(?!.*test).*$", description: "Paths NOT containing 'test'" },
];

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
  const availableFilterOptions = availableFilters
    ? FilterOptions.filter(option => availableFilters?.includes(option.value)).filter(
        option => IS_CLOUD || !option.cloudOnly
      )
    : FilterOptions.filter(option => IS_CLOUD || !option.cloudOnly);

  const isNumeric = isNumericParameter(filter.parameter);
  const operatorOptions = isNumeric ? NumericOperatorOptions : StringOperatorOptions;

  // Check if we need a text input instead of multi-select
  const needsTextInput =
    isNumeric ||
    filter.type === "regex" ||
    filter.type === "not_regex" ||
    filter.type === "greater_than" ||
    filter.type === "less_than";

  const isRegexFilter = filter.type === "regex" || filter.type === "not_regex";
  const regexError = useMemo(() => {
    if (!isRegexFilter) return null;
    return validateRegex(String(filter.value[0] ?? ""));
  }, [isRegexFilter, filter.value]);

  const handleParameterChange = (value: string) => {
    const newParam = value as FilterParameter;
    const newIsNumeric = isNumericParameter(newParam);

    // Reset filter type if switching between numeric and string parameters
    // and current type is not compatible
    let newType = filter.type;
    if (newIsNumeric && (filter.type === "contains" || filter.type === "not_contains" || filter.type === "regex" || filter.type === "not_regex")) {
      newType = "equals";
    } else if (!newIsNumeric && (filter.type === "greater_than" || filter.type === "less_than")) {
      newType = "equals";
    }

    updateFilter(
      {
        ...filter,
        value: [],
        parameter: newParam,
        type: newType,
      },
      index
    );
  };

  return (
    <div className="grid grid-cols-[220px_auto] md:grid-cols-[160px_130px_250px_auto] gap-2">
      <Select onValueChange={handleParameterChange} value={filter.parameter}>
        <SelectTrigger>
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          {availableFilterOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter.type}
        onValueChange={value => {
          updateFilter(
            {
              ...filter,
              type: value as FilterType,
              // Clear value when switching to/from regex or numeric comparison
              value: [],
            },
            index
          );
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {operatorOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {needsTextInput ? (
        <div className="flex items-center gap-1">
          <div className="flex-1 relative">
            <Input
              value={String(filter.value[0] ?? "")}
              onChange={e => {
                updateFilter({ ...filter, value: [e.target.value] }, index);
              }}
              placeholder={isRegexFilter ? "e.g. ^/blog/.*" : "Enter value..."}
              className={`h-9 ${regexError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {regexError && (
              <div className="absolute -bottom-5 left-0 text-xs text-red-500 truncate max-w-full">
                {regexError}
              </div>
            )}
          </div>
          {isRegexFilter && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" type="button">
                  <HelpCircle className="h-4 w-4 text-neutral-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Regex Examples:</p>
                  <ul className="text-xs space-y-1">
                    {REGEX_EXAMPLES.map((ex, i) => (
                      <li key={i}>
                        <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{ex.pattern}</code>
                        <span className="text-neutral-500 ml-1">— {ex.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      ) : (
        <ValueSelect
          onChange={value => {
            updateFilter({ ...filter, value: value }, index);
          }}
          parameter={filter.parameter}
          value={filter.value}
        />
      )}
      <Button
        variant={"ghost"}
        size={"icon"}
        onClick={() => {
          updateFilter(null, index);
        }}
      >
        <Trash className="w-4 h-4" />
      </Button>
    </div>
  );
}
