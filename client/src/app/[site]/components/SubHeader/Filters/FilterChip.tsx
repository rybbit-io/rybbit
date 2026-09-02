"use client";

import { Filter, FilterParameter } from "@rybbit/shared";
import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "../../../../../components/ui/button";
import { ButtonGroup } from "../../../../../components/ui/button-group";
import { useGetRegionName } from "../../../../../lib/geo";
import { cn } from "../../../../../lib/utils";
import { isNumericParameter } from "./const";
import {
  formatDisplayValue,
  getParameterIcon,
  operatorNeedsValue,
  useOperatorLabel,
  useParameterLabel,
} from "./labels";
import { OperatorPopover } from "./OperatorPopover";
import { ParameterPopover } from "./ParameterPopover";
import { ValuePopover } from "./ValuePopover";

/**
 * One editable filter pill: dimension, operator, value, remove. Used by the
 * dashboard's chip row and by the segment editor, so both edit a filter the
 * same way.
 */
export function FilterChip({
  filter,
  onUpdate,
  onRemove,
  availableFilters,
  disabled,
}: {
  filter: Filter;
  onUpdate: (filter: Filter) => void;
  onRemove: () => void;
  availableFilters?: FilterParameter[];
  disabled?: boolean;
}) {
  const t = useExtracted();
  const { getRegionName } = useGetRegionName();
  const getParameterLabel = useParameterLabel();
  const getOperatorLabel = useOperatorLabel();

  const isNumeric = isNumericParameter(filter.parameter);
  const displayValue = formatDisplayValue(filter, getRegionName);
  const hasValue = filter.value.length > 0;

  return (
    <ButtonGroup>
      <ParameterPopover filter={filter} onUpdate={onUpdate} availableFilters={availableFilters}>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          className={cn(
            "font-normal py-1.5 px-2 gap-1.5",
            disabled ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-700 dark:text-neutral-100"
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
          className="font-normal p-1.5 text-neutral-500 dark:text-neutral-400"
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
        onClick={onRemove}
        aria-label={t("Remove filter")}
      >
        <X size={14} strokeWidth={2.5} />
      </Button>
    </ButtonGroup>
  );
}
