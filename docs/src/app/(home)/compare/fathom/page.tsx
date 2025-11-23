import { ComparisonPage } from "../components/ComparisonPage";
import { fathomComparisonData } from "./comparison-data";
import { FathomComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rybbit vs Fathom",
  description: "Compare Rybbit and Fathom. Privacy-first analytics solutions compared.",
};

export default function Fathom() {
  return (
    <ComparisonPage
      competitorName="Fathom"
      sections={fathomComparisonData}
      comparisonContent={<FathomComparisonContent />}
    />
  );
}