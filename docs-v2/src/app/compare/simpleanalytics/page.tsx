import { ComparisonPage } from "../components/ComparisonPage";
import { simpleAnalyticsComparisonData } from "./comparison-data";
import { SimpleAnalyticsComparisonContent } from "./ComparisonContent";

export default function SimpleAnalytics() {
  return (
    <ComparisonPage
      competitorName="SimpleAnalytics"
      sections={simpleAnalyticsComparisonData}
      comparisonContent={<SimpleAnalyticsComparisonContent />}
    />
  );
}