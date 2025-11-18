import { ComparisonPage } from "../components/ComparisonPage";
import { simpleAnalyticsComparisonData } from "./comparison-data";
import { SimpleAnalyticsComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rybbit vs Simple Analytics",
  description: "Compare Rybbit and Simple Analytics. Privacy-first web analytics solutions compared.",
};

export default function SimpleAnalytics() {
  return (
    <ComparisonPage
      competitorName="SimpleAnalytics"
      sections={simpleAnalyticsComparisonData}
      comparisonContent={<SimpleAnalyticsComparisonContent />}
    />
  );
}