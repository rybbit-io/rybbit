import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";

/**
 * Builds links to other pages of the site being viewed. They stay inside a
 * private link, and `keepQuery` carries the address bar's period and filters
 * across the way the sidebar's links do.
 */
export function useSitePath(): (route: string, options?: { keepQuery?: boolean }) => string {
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);
  const searchParams = useSearchParams();

  return (route, { keepQuery = false } = {}) => {
    const path = privateKey ? `/${site}/${privateKey}/${route}` : `/${site}/${route}`;
    const query = keepQuery ? searchParams.toString() : "";
    return query ? `${path}?${query}` : path;
  };
}
