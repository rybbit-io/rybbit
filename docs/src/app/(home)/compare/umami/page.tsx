import { ComparisonPage } from "../components/ComparisonPage";
import { umamiComparisonData } from "./comparison-data";
import { UmamiComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rybbit vs Umami",
  description: "Compare Rybbit and Umami. Open-source, privacy-focused web analytics platforms compared.",
};

export default function Umami() {
  return (
    <ComparisonPage
      competitorName="Umami"
      sections={umamiComparisonData}
      comparisonContent={<UmamiComparisonContent />}
    />
  );
}