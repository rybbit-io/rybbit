import { ComparisonPage } from "../components/ComparisonPage";
import { googleAnalyticsComparisonData } from "./comparison-data";
import { GoogleAnalyticsComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rybbit vs Google Analytics",
  description: "Compare Rybbit and Google Analytics. Privacy-focused, open-source analytics vs Google's enterprise solution.",
};

export default function GoogleAnalytics() {
  return (
    <ComparisonPage
      competitorName="Google Analytics"
      sections={googleAnalyticsComparisonData}
      comparisonContent={<GoogleAnalyticsComparisonContent />}
    />
  );
}
