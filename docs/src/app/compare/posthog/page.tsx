import { ComparisonPage } from "../components/ComparisonPage";
import { posthogComparisonData } from "./comparison-data";
import { PostHogComparisonContent } from "./ComparisonContent";

export default function PostHog() {
  return (
    <ComparisonPage
      competitorName="PostHog"
      sections={posthogComparisonData}
      comparisonContent={<PostHogComparisonContent />}
    />
  );
}