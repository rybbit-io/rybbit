import { Filter } from "@rybbit/shared";
import { usePivotHref } from "../../../hooks/usePivotHref";

/**
 * A link to the Pages page of this site with the current period and filters,
 * narrowed by `filters`. Built from the Sessions pivot (same site, same query
 * string, private-link key included) with the route swapped, so it carries
 * exactly what a pivot carries.
 */
export function usePagesHref(): (filters?: Filter[]) => string {
  const pivotHref = usePivotHref();
  return filters => pivotHref("sessions", filters).replace(/\/sessions(?=\?|$)/, "/pages");
}
