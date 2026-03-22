import { ComparisonPage } from "../components/ComparisonPage";
import { simpleAnalyticsComparisonData, simpleAnalyticsExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Simple Analytics: Feature-Rich Alternative",
  description:
    "Compare Rybbit and Simple Analytics. Both are privacy-focused, but Rybbit offers more advanced features like session replay, funnels, and user journeys.",
  openGraph: {
    title: "Rybbit vs Simple Analytics: Simple AND Powerful",
    description: "Simple Analytics keeps it basic. Rybbit adds power without complexity. Compare features.",
    type: "website",
    url: "https://rybbit.com/compare/simpleanalytics",
    images: [createOGImageUrl("Rybbit vs Simple Analytics: Simple AND Powerful", "Simple Analytics keeps it basic. Rybbit adds power without complexity. Compare features.", "Compare")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Simple Analytics",
    description: "Privacy-first analytics compared. See which offers the best value.",
    images: [createOGImageUrl("Rybbit vs Simple Analytics", "Privacy-first analytics compared. See which offers the best value.", "Compare")],
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
          name: "Is Rybbit open source while Simple Analytics is not?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit is fully open source under the AGPL v3 license, so you can inspect the code and self-host it. Simple Analytics is proprietary and closed-source with no self-hosting option.",
          },
        },
        {
          "@type": "Question",
          name: "What features does Rybbit have that Simple Analytics doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit includes session replay, funnel analysis, user journey visualization (Sankey diagrams), Web Vitals monitoring, error tracking, user profiles, city-level geolocation, and organization support. Simple Analytics focuses on simpler metrics with an AI assistant.",
          },
        },
        {
          "@type": "Question",
          name: "How does geolocation differ between the two?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit provides city-level geolocation data, giving you more granular insights into where your visitors are. Simple Analytics only offers country-level data, which limits your ability to understand regional traffic patterns.",
          },
        },
        {
          "@type": "Question",
          name: "Are both equally private?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are privacy-first and cookie-free with EU data storage. Rybbit adds a daily rotating salt option for extra privacy, ensuring visitor IDs can't be tracked across days. Both are GDPR compliant without requiring consent banners.",
          },
        },
        {
          "@type": "Question",
          name: "Can I switch from Simple Analytics to Rybbit easily?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add Rybbit's tracking script to your site and data collection begins immediately. You can run both tools in parallel during the transition. Setup takes less than 5 minutes.",
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
        competitorName="Simple Analytics"
        sections={simpleAnalyticsComparisonData}
        subtitle={simpleAnalyticsExtendedData.subtitle}
        introHeading={simpleAnalyticsExtendedData.introHeading}
        introParagraphs={simpleAnalyticsExtendedData.introParagraphs}
        chooseRybbit={simpleAnalyticsExtendedData.chooseRybbit}
        chooseCompetitor={simpleAnalyticsExtendedData.chooseCompetitor}
        rybbitPricing={simpleAnalyticsExtendedData.rybbitPricing}
        competitorPricing={simpleAnalyticsExtendedData.competitorPricing}
        faqItems={simpleAnalyticsExtendedData.faqItems}
        relatedResources={simpleAnalyticsExtendedData.relatedResources}
      />
    </>
  );
}
