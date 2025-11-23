import { ComparisonPage } from "../components/ComparisonPage";
import { matomoComparisonData } from "./comparison-data";
import { MatomoComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rybbit vs Matomo",
  description: "Compare Rybbit and Matomo. Open-source, privacy-focused web analytics platforms compared.",
};

export default function Matomo() {
  return (
    <ComparisonPage
      competitorName="Matomo"
      sections={matomoComparisonData}
      comparisonContent={<MatomoComparisonContent />}
    />
  );
}