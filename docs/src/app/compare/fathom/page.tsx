import { ComparisonPage } from "../components/ComparisonPage";
import { fathomComparisonData } from "./comparison-data";
import { FathomComparisonContent } from "./ComparisonContent";

export default function Fathom() {
  return (
    <ComparisonPage
      competitorName="Fathom"
      sections={fathomComparisonData}
      comparisonContent={<FathomComparisonContent />}
    />
  );
}