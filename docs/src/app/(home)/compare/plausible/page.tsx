import { ComparisonPage } from "../components/ComparisonPage";
import { plausibleComparisonData } from "./comparison-data";
import { PlausibleComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rybbit vs Plausible",
  description: "Compare Rybbit and Plausible. Open-source, privacy-first analytics platforms compared.",
};

export default function Plausible() {
  return (
    <ComparisonPage
      competitorName="Plausible"
      sections={plausibleComparisonData}
      comparisonContent={<PlausibleComparisonContent />}
    />
  );
}