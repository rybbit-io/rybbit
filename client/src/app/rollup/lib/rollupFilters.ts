import { Filter, FilterParameter } from "@rybbit/shared";
import { create } from "zustand";

/**
 * Dimensions the rollup page can filter by: exactly the ones its sections
 * break traffic down by. Site-specific dimensions (pages, events, users) mean
 * nothing across a set of unrelated sites.
 */
export const ROLLUP_FILTER_PARAMETERS: FilterParameter[] = [
  "referrer",
  "channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "browser",
  "device_type",
  "operating_system",
  "dimensions",
  "country",
  "region",
  "city",
  "language",
  "timezone",
];

/**
 * The rollup's own filters. Kept apart from the main store's `filters`, which
 * belong to whichever site dashboard was open last and would otherwise leak
 * into the rollup (and back out of it).
 */
export const useRollupFilters = create<{ filters: Filter[] }>(() => ({ filters: [] }));

const sameFilter = (a: Filter, b: Filter) => a.parameter === b.parameter && a.type === b.type;

export function addRollupFilter(filter: Filter) {
  const { filters } = useRollupFilters.getState();
  const index = filters.findIndex(f => sameFilter(f, filter));
  useRollupFilters.setState({
    filters: index === -1 ? [...filters, filter] : filters.map((f, i) => (i === index ? filter : f)),
  });
}

export function updateRollupFilter(filter: Filter, index: number) {
  const { filters } = useRollupFilters.getState();
  useRollupFilters.setState({ filters: filters.map((f, i) => (i === index ? filter : f)) });
}

export function removeRollupFilter(filter: Filter) {
  const { filters } = useRollupFilters.getState();
  useRollupFilters.setState({ filters: filters.filter(f => f !== filter) });
}

/** Clicking a breakdown row toggles an "is" filter on that value, like the site dashboard. */
export function toggleRollupFilter(parameter: FilterParameter, value: string) {
  const { filters } = useRollupFilters.getState();
  const found = filters.find(f => f.parameter === parameter && f.value.some(v => v === value));
  if (found) removeRollupFilter(found);
  else addRollupFilter({ parameter, type: "equals", value: [value] });
}
