import { ComparisonPage } from "../components/ComparisonPage";
import { cloudflareAnalyticsComparisonData } from "./comparison-data";
import { CloudflareAnalyticsComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rybbit vs Cloudflare Analytics",
  description: "Compare Rybbit and Cloudflare Analytics. Privacy-focused analytics platforms compared.",
};

export default function CloudflareAnalytics() {
  return (
    <ComparisonPage
      competitorName="Cloudflare Analytics"
      sections={cloudflareAnalyticsComparisonData}
      comparisonContent={<CloudflareAnalyticsComparisonContent />}
    />
  );
}