import { ComparisonPage } from "../components/ComparisonPage";
import { umamiComparisonData } from "./comparison-data";
import { UmamiComparisonContent } from "./ComparisonContent";

export default function Umami() {
  return (
    <ComparisonPage
      competitorName="Umami"
      sections={umamiComparisonData}
      comparisonContent={<UmamiComparisonContent />}
    />
  );
}