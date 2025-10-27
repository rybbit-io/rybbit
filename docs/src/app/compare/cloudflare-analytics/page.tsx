import { ComparisonPage } from "../components/ComparisonPage";
import { cloudflareAnalyticsComparisonData } from "./comparison-data";
import { CloudflareAnalyticsComparisonContent } from "./ComparisonContent";

export default function CloudflareAnalytics() {
  return (
    <ComparisonPage
      competitorName="Cloudflare Analytics"
      sections={cloudflareAnalyticsComparisonData}
      comparisonContent={<CloudflareAnalyticsComparisonContent />}
    />
  );
}