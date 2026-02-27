import { ComparisonPage } from "../components/ComparisonPage";
import { fathomComparisonData } from "./comparison-data";
import { FathomComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Fathom: Privacy Analytics Comparison 2025",
  description:
    "Compare Rybbit and Fathom analytics. Both prioritize privacy, but Rybbit offers more features like session replay, funnels, and open-source flexibility.",
  openGraph: {
    title: "Rybbit vs Fathom: More Features, Same Privacy Focus",
    description: "Fathom is simple. Rybbit is simple AND powerful. Compare session replay, funnels, and more.",
    type: "website",
    url: "https://rybbit.com/compare/fathom",
    images: [createOGImageUrl("Rybbit vs Fathom: More Features, Same Privacy Focus", "Fathom is simple. Rybbit is simple AND powerful. Compare session replay, funnels, and more.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Fathom Analytics",
    description: "Privacy-first analytics compared. See which offers more value.",
    images: [createOGImageUrl("Rybbit vs Fathom Analytics", "Privacy-first analytics compared. See which offers more value.")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/fathom",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/fathom",
      name: "Rybbit vs Fathom Comparison",
      description: "Compare Rybbit and Fathom analytics platforms",
      url: "https://rybbit.com/compare/fathom",
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
          name: "How does Rybbit compare to Fathom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both Rybbit and Fathom are privacy-first analytics platforms. Rybbit offers additional features like session replay, funnels, user journeys, and is fully open-source, while Fathom focuses on simplicity.",
          },
        },
        {
          "@type": "Question",
          name: "Is Rybbit open-source unlike Fathom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit is fully open-source and can be self-hosted for free. Fathom is closed-source and only available as a paid cloud service.",
          },
        },
        {
          "@type": "Question",
          name: "Which has more features, Rybbit or Fathom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit offers more features including session replay, funnel analysis, user journey visualization, Web Vitals monitoring, error tracking, and public dashboards. Fathom focuses on basic pageview analytics.",
          },
        },
      ],
    },
  ],
};

export default function Fathom() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Fathom"
        sections={fathomComparisonData}
        comparisonContent={<FathomComparisonContent />}
      />
    </>
  );
}
