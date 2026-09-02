"use client";

import { Segment } from "@rybbit/shared";
import { Building2, ChevronDown, Layers, Lock, Pencil, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "../../../../../components/ui/button";
import { ButtonGroup } from "../../../../../components/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useGetRegionName } from "../../../../../lib/geo";
import { clearSegment } from "../../../../../lib/store";
import { isNumericParameter } from "./const";
import {
  formatDisplayValue,
  getParameterIcon,
  operatorNeedsValue,
  useOperatorLabel,
  useParameterLabel,
} from "./labels";

/**
 * One pill for an applied segment. It expands to show the filters it
 * contributed (read-only, so the definition cannot drift by accident) and
 * removes them all at once. "Edited" means one of those filters is no longer
 * in the row, so the segment is a label rather than a guarantee.
 */
export function SegmentChip({
  segment,
  intact,
  onEdit,
}: {
  segment: Segment;
  intact: boolean;
  onEdit?: (segment: Segment) => void;
}) {
  const t = useExtracted();
  const { getRegionName } = useGetRegionName();
  const getParameterLabel = useParameterLabel();
  const getOperatorLabel = useOperatorLabel();

  const remove = () => clearSegment(segment.filters);

  return (
    <ButtonGroup>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="py-1.5 px-2 gap-1.5 text-neutral-900 dark:text-neutral-100 max-w-[320px]"
          >
            <Layers className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
            <span className="truncate font-medium">{segment.name}</span>
            {!intact && (
              <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">{t("(edited)")}</span>
            )}
            <ChevronDown className="h-3 w-3 shrink-0 text-neutral-500 dark:text-neutral-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="px-3 pt-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{segment.name}</span>
              {segment.siteId === null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  </TooltipTrigger>
                  <TooltipContent>{t("Shared with every site in the organization")}</TooltipContent>
                </Tooltip>
              )}
            </div>
            {segment.description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{segment.description}</p>
            )}
          </div>
          <div className="px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1.5">
              {t("Defined as")}
            </div>
            <ul className="flex flex-col gap-1">
              {segment.filters.map((filter, index) => (
                <li key={index} className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-200">
                  <span className="text-neutral-500 dark:text-neutral-400 [&_svg]:h-3.5 [&_svg]:w-3.5">
                    {getParameterIcon(filter.parameter)}
                  </span>
                  <span>{getParameterLabel(filter.parameter)}</span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {getOperatorLabel(filter.type, isNumericParameter(filter.parameter))}
                  </span>
                  {operatorNeedsValue(filter.type) && (
                    <span className="font-medium truncate">{formatDisplayValue(filter, getRegionName)}</span>
                  )}
                </li>
              ))}
            </ul>
            {!intact && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                {t("Some of these filters were changed on the dashboard. The segment itself is unchanged.")}
              </p>
            )}
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-800 p-2 flex items-center justify-between">
            {segment.canEdit && onEdit ? (
              <Button size="sm" variant="ghost" onClick={() => onEdit(segment)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                {t("Edit segment")}
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 px-2 text-xs text-neutral-500 dark:text-neutral-400">
                <Lock className="h-3 w-3" />
                {t("Read-only")}
              </span>
            )}
            <Button size="sm" variant="ghost" onClick={remove} className="text-neutral-500 dark:text-neutral-400">
              {t("Remove")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="secondary"
        size="sm"
        className="text-neutral-500 dark:text-neutral-400 px-1.5"
        onClick={remove}
        aria-label={t("Remove segment")}
      >
        <X size={14} strokeWidth={2.5} />
      </Button>
    </ButtonGroup>
  );
}
