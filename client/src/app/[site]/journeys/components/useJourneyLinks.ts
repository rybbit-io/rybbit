import { usePivotHref } from "@/hooks/usePivotHref";
import { useStore } from "@/lib/store";

/**
 * Where a page name leads: the Pages page with the current period and filters,
 * narrowed to that page. The shared pivots only know the Sessions, Users and
 * Replay pages, so this borrows the Sessions link (same query string, built by
 * the same serializer) and points it at Pages.
 *
 * Returns undefined for a section such as /docs/**, which is not one page.
 */
export function usePagesHref(): (page: string) => string | undefined {
  const pivotHref = usePivotHref();

  return page => {
    if (page.includes("*")) return undefined;
    const href = pivotHref("sessions", [{ parameter: "pathname", type: "equals", value: [page] }]);
    const queryStart = href.indexOf("?");
    const path = queryStart === -1 ? href : href.slice(0, queryStart);
    const query = queryStart === -1 ? "" : href.slice(queryStart);
    return `${path.replace(/\/sessions$/, "/pages")}${query}`;
  };
}

/** A page of the current site, staying inside a private-link view. */
export function useSiteHref(): (route: string) => string {
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);
  return route => (privateKey ? `/${site}/${privateKey}/${route}` : `/${site}/${route}`);
}
