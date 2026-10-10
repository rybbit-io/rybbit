import { useStore } from "@/lib/store";
import { buildAnalyticsRequest } from "../analyticsRequest";
import { SiteCardsResponse } from "../endpoints/siteCards";
import { useAnalyticsContext, useAnalyticsQuery } from "../useAnalyticsQuery";

export function useGetSiteCards(organizationId: string, siteIds: number[], lite: boolean) {
  const bucket = useStore(state => state.bucket);
  const previous = useAnalyticsContext({ periodTime: "previous", useFilters: false });
  const comparison = previous.hasPeriod ? buildAnalyticsRequest({ path: "" }, previous.context).params : null;

  return useAnalyticsQuery<SiteCardsResponse>({
    key: "site-cards",
    path: lite ? "site-cards-lite" : "site-cards",
    organizationId,
    useFilters: false,
    params: { bucket },
    body: () => ({ siteIds: [...new Set(siteIds)].sort((a, b) => a - b), comparison }),
    enabled: siteIds.length > 0,
    // A new page, organization or period must never show the old cards' totals.
    placeholder: false,
  });
}
