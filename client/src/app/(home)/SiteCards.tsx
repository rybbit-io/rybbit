import { useGetSiteCards } from "@/api/analytics/hooks/useGetSiteCards";
import { ErrorState } from "@/components/ErrorState";
import { LITE_DASHBOARD } from "@/lib/const";
import { useStore } from "@/lib/store";
import { hasRangeTimes } from "@/lib/time";
import { BatchedSiteCard, SiteCard, SiteCardProps } from "./SiteCard";

interface SiteCardsProps extends Omit<SiteCardProps, "siteId" | "name" | "domain" | "tags"> {
  organizationId: string;
  sites: Pick<SiteCardProps, "siteId" | "name" | "domain" | "tags">[];
}

export function SiteCards({ organizationId, sites, ...props }: SiteCardsProps) {
  const time = useStore(state => state.time);
  const previousTime = useStore(state => state.previousTime);
  const bucket = useStore(state => state.bucket);
  if (!LITE_DASHBOARD) {
    return <BatchedSiteCards organizationId={organizationId} sites={sites} lite={false} {...props} />;
  }
  // An unbounded hourly chart also contains event-only buckets from the old
  // overview JOIN. Keep that path; bounded charts get those zeros from FILL.
  const unboundedHourlyChart = time.mode === "all-time" && !["day", "week", "month", "year"].includes(bucket);
  // Exact datetime ranges retain the existing raw-events fallback. A custom
  // comparison can also be exact even when the current period is a whole day.
  if (!unboundedHourlyChart && !hasRangeTimes(time) && !(previousTime && hasRangeTimes(previousTime))) {
    return <BatchedSiteCards organizationId={organizationId} sites={sites} lite {...props} />;
  }
  return sites.map(site => <SiteCard key={site.siteId} {...site} {...props} />);
}

function BatchedSiteCards({ organizationId, sites, lite, ...props }: SiteCardsProps & { lite: boolean }) {
  const { data, error, refetch } = useGetSiteCards(
    organizationId,
    sites.map(site => site.siteId),
    lite
  );
  if (error && !data) {
    return <ErrorState title="" message="" refetch={refetch} />;
  }
  return sites.map(site => <BatchedSiteCard key={site.siteId} {...site} {...props} metrics={data?.[site.siteId]} />);
}
