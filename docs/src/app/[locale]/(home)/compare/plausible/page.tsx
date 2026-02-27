import { ComparisonPage } from "../components/ComparisonPage";
import { plausibleComparisonData } from "./comparison-data";
import { PlausibleComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Plausible: Feature Comparison 2025",
  description:
    "Compare Rybbit and Plausible analytics. Both are privacy-first, but Rybbit offers more features like session replay, funnels, and user journeys at competitive pricing.",
  openGraph: {
    title: "Rybbit vs Plausible: Which Privacy-First Analytics Wins?",
    description: "Both respect privacy, but Rybbit offers more power. Compare session replay, funnels, and pricing.",
    type: "website",
    url: "https://rybbit.com/compare/plausible",
    images: [createOGImageUrl("Rybbit vs Plausible: Which Privacy-First Analytics Wins?", "Both respect privacy, but Rybbit offers more power. Compare session replay, funnels, and pricing.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Plausible Comparison",
    description: "Privacy-first analytics showdown. See which platform offers more value.",
    images: [createOGImageUrl("Rybbit vs Plausible Comparison", "Privacy-first analytics showdown. See which platform offers more value.")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/plausible",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/plausible",
      name: "Rybbit vs Plausible Comparison",
      description: "Compare Rybbit and Plausible analytics platforms",
      url: "https://rybbit.com/compare/plausible",
      isPartOf: {
        "@type": "WebSite",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Rybbit compare to Plausible?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both Rybbit and Plausible are privacy-first analytics platforms, but Rybbit offers more advanced features like session replay, funnels, user journeys, and error tracking while maintaining simplicity.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit have features Plausible doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit includes session replay, funnel analysis, user journey visualization (Sankey diagrams), Web Vitals monitoring, error tracking, and public dashboards that Plausible doesn't offer.",
          },
        },
        {
          "@type": "Question",
          name: "Which is more affordable, Rybbit or Plausible?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit offers competitive pricing starting at $19/month for 100k events with a generous free tier. Both platforms offer similar value, but Rybbit includes more features at each price point.",
          },
        },
      ],
    },
  ],
};

export default function Plausible() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Plausible"
        sections={plausibleComparisonData}
        comparisonContent={<PlausibleComparisonContent />}
      />
    </>
  );
}
