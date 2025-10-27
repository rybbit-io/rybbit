import { ComparisonPage } from "../components/ComparisonPage";
import { matomoComparisonData } from "./comparison-data";
import { MatomoComparisonContent } from "./ComparisonContent";

export default function Matomo() {
  return (
    <ComparisonPage
      competitorName="Matomo"
      sections={matomoComparisonData}
      comparisonContent={<MatomoComparisonContent />}
    />
  );
}