import { ComparisonPage } from "../components/ComparisonPage";
import { plausibleComparisonData } from "./comparison-data";
import { PlausibleComparisonContent } from "./ComparisonContent";

export default function Plausible() {
  return (
    <ComparisonPage
      competitorName="Plausible"
      sections={plausibleComparisonData}
      comparisonContent={<PlausibleComparisonContent />}
    />
  );
}