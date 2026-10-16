import { FilterParameter } from "@rybbit/shared";
import { useGetSite } from "../api/admin/hooks/useSites";
import { filtersForSite } from "../lib/filterGroups";
import { useStore } from "../lib/store";

/** Narrows a page's filter list to what the current site actually reports. */
export function useSiteFilters(filters: FilterParameter[]): FilterParameter[] {
  const site = useStore(state => state.site);
  const { data: siteMetadata } = useGetSite(site);
  return filtersForSite(filters, (siteMetadata?.type ?? "web") !== "web");
}
