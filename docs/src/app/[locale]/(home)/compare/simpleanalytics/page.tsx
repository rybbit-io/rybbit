import { ComparisonPage } from "../components/ComparisonPage";
import { simpleAnalyticsComparisonData } from "./comparison-data";
import { SimpleAnalyticsComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Simple Analytics: Feature Comparison 2025",
  description:
    "Compare Rybbit and Simple Analytics. Both are privacy-focused, but Rybbit offers more advanced features like session replay, funnels, and user journeys.",
  openGraph: {
    title: "Rybbit vs Simple Analytics: Simple AND Powerful",
    description: "Simple Analytics keeps it basic. Rybbit adds power without complexity. Compare features.",
    type: "website",
    url: "https://rybbit.com/compare/simpleanalytics",
    images: [createOGImageUrl("Rybbit vs Simple Analytics: Simple AND Powerful", "Simple Analytics keeps it basic. Rybbit adds power without complexity. Compare features.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Simple Analytics",
    description: "Privacy-first analytics compared. See which offers the best value.",
    images: [createOGImageUrl("Rybbit vs Simple Analytics", "Privacy-first analytics compared. See which offers the best value.")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/simpleanalytics",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/simpleanalytics",
      name: "Rybbit vs Simple Analytics Comparison",
      description: "Compare Rybbit and Simple Analytics platforms",
      url: "https://rybbit.com/compare/simpleanalytics",
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
          name: "How does Rybbit compare to Simple Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are privacy-first analytics platforms, but Rybbit offers more advanced features like session replay, funnels, user journeys, and error tracking while maintaining a simple, intuitive interface.",
          },
        },
        {
          "@type": "Question",
          name: "Is Rybbit more feature-rich than Simple Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit includes session replay, funnel analysis, user journey visualization, Web Vitals monitoring, error tracking, and public dashboards. Simple Analytics focuses on basic metrics and simplicity.",
          },
        },
        {
          "@type": "Question",
          name: "Which is better value, Rybbit or Simple Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit offers more features at competitive pricing, plus a generous free tier and open-source self-hosting option. Simple Analytics has fixed pricing without a free tier.",
          },
        },
      ],
    },
  ],
};

export default function SimpleAnalytics() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="SimpleAnalytics"
        sections={simpleAnalyticsComparisonData}
        comparisonContent={<SimpleAnalyticsComparisonContent />}
      />
    </>
  );
}
