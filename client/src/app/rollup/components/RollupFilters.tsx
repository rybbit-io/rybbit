"use client";
import { Filter, FilterParameter } from "@rybbit/shared";
import { ListFilterPlus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRef, useState } from "react";
import { FilterChip } from "@/app/[site]/components/SubHeader/Filters/FilterChip";
import { FilterPicker } from "@/app/[site]/components/SubHeader/Filters/FilterPicker";
import { filterListKeys } from "@/app/[site]/components/SubHeader/Filters/segmentUtils";
import { FilterValueSitesContext } from "@/app/[site]/components/SubHeader/Filters/useFilterValueOptions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  addRollupFilter,
  removeRollupFilter,
  ROLLUP_FILTER_PARAMETERS,
  updateRollupFilter,
  useRollupFilters,
} from "../lib/rollupFilters";

/**
 * The site dashboard's filter picker and chips, pointed at the rollup's own
 * filters and limited to the dimensions this page shows. Value suggestions
 * come from every selected site. No segments: those are saved per site.
 */
export function RollupFilterButton({ siteIds }: { siteIds: number[] }) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [parameter, setParameter] = useState<FilterParameter | null>(null);
  const pendingRef = useRef<() => Filter | null>(() => null);

  const resetPicker = () => {
    pendingRef.current = () => null;
    setParameter(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const pending = pendingRef.current();
      if (pending) addRollupFilter(pending);
      resetPicker();
    }
    setOpen(isOpen);
  };

  return (
    <FilterValueSitesContext.Provider value={siteIds}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            <ListFilterPlus className="w-4 h-4" />
            {t("Filter")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <FilterPicker
            availableFilters={ROLLUP_FILTER_PARAMETERS}
            onCommit={addRollupFilter}
            onClose={() => {
              resetPicker();
              setOpen(false);
            }}
            pendingRef={pendingRef}
            parameter={parameter}
            setParameter={setParameter}
          />
        </PopoverContent>
      </Popover>
    </FilterValueSitesContext.Provider>
  );
}

export function RollupFilterChips({ siteIds }: { siteIds: number[] }) {
  const filters = useRollupFilters(state => state.filters);
  if (filters.length === 0) return null;
  const keys = filterListKeys(filters);

  return (
    <FilterValueSitesContext.Provider value={siteIds}>
      <div className="flex gap-2 flex-wrap">
        {filters.map((filter, index) => (
          <FilterChip
            key={keys[index]}
            filter={filter}
            availableFilters={ROLLUP_FILTER_PARAMETERS}
            onUpdate={next => updateRollupFilter(next, index)}
            onRemove={() => removeRollupFilter(filter)}
          />
        ))}
      </div>
    </FilterValueSitesContext.Provider>
  );
}
