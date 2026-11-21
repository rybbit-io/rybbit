"use client";

import { ArrowUpDown } from "lucide-react";
import { useExtracted } from "next-intl";
import { ControlButton } from "@/components/site/ControlButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FunnelSort } from "./funnelMetrics";

const SORTS: FunnelSort[] = ["entered", "conversion", "change", "name", "created"];

export interface FunnelSortControlProps {
  value: FunnelSort;
  onChange: (value: FunnelSort) => void;
  /** Sorting by change needs a comparison period. */
  comparisonEnabled: boolean;
}

export function FunnelSortControl({ value, onChange, comparisonEnabled }: FunnelSortControlProps) {
  const t = useExtracted();

  const labels: Record<FunnelSort, string> = {
    entered: t("Sessions entered"),
    conversion: t("Conversion"),
    change: t("Change in conversion"),
    name: t("Name"),
    created: t("Date created"),
  };
  const options = SORTS.filter(sort => sort !== "change" || comparisonEnabled);

  // Radix hands back a plain string; looking the option up returns it as a FunnelSort.
  const select = (next: string) => {
    const option = options.find(candidate => candidate === next);
    if (option) onChange(option);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ControlButton icon={<ArrowUpDown />} label={t("Sort")} value={labels[value]} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={select}>
          {options.map(option => (
            <DropdownMenuRadioItem key={option} value={option}>
              {labels[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
