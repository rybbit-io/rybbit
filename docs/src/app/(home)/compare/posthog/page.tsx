import { ComparisonPage } from "../components/ComparisonPage";
import { posthogComparisonData } from "./comparison-data";
import { PostHogComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rybbit vs PostHog",
  description: "Compare Rybbit and PostHog. Privacy-focused analytics and product analytics platforms compared.",
};

export default function PostHog() {
  return (
    <ComparisonPage
      competitorName="PostHog"
      sections={posthogComparisonData}
      comparisonContent={<PostHogComparisonContent />}
    />
  );
}