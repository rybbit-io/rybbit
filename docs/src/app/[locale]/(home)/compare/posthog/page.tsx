import { ComparisonPage } from "../components/ComparisonPage";
import { posthogComparisonData, posthogExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs PostHog: Simple Analytics Alternative",
  description:
    "Compare Rybbit and PostHog. See why Rybbit's focused web analytics beats PostHog's complex product suite for teams wanting simplicity without sacrificing power.",
  openGraph: {
    title: "Rybbit vs PostHog: Focused Analytics vs Feature Bloat",
    description: "PostHog does everything. Rybbit does web analytics perfectly. Compare the approaches.",
    type: "website",
    url: "https://rybbit.com/compare/posthog",
    images: [createOGImageUrl("Rybbit vs PostHog: Focused Analytics vs Feature Bloat", "PostHog does everything. Rybbit does web analytics perfectly. Compare the approaches.", "Compare")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs PostHog Comparison",
    description: "Focused web analytics vs all-in-one platform. Which approach fits your needs?",
    images: [createOGImageUrl("Rybbit vs PostHog Comparison", "Focused web analytics vs all-in-one platform. Which approach fits your needs?", "Compare")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/posthog",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/posthog",
      name: "Rybbit vs PostHog Comparison",
      description: "Compare Rybbit and PostHog analytics platforms",
      url: "https://rybbit.com/compare/posthog",
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
          name: "How is Rybbit different from PostHog?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit focuses exclusively on web analytics with a clean, simple interface. PostHog is an all-in-one product suite with analytics, feature flags, A/B testing, surveys, and more. If you primarily need web analytics, Rybbit delivers a faster, simpler experience.",
          },
        },
        {
          "@type": "Question",
          name: "Is Rybbit really simpler than PostHog?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit provides a single-page dashboard where all essential metrics are visible at a glance. PostHog's extensive feature set means more menus, more configuration, and a steeper learning curve, especially for non-technical team members.",
          },
        },
        {
          "@type": "Question",
          name: "Does PostHog have features Rybbit doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, PostHog offers feature flags, A/B testing, surveys, heatmaps, and a SQL query interface that Rybbit doesn't have. These are powerful tools for product teams, but they add complexity. Rybbit intentionally focuses on doing web analytics well.",
          },
        },
        {
          "@type": "Question",
          name: "How does self-hosting compare?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit is straightforward to self-host with a modern TypeScript/ClickHouse stack. PostHog's self-hosted version requires significantly more infrastructure (Kafka, Redis, PostgreSQL, ClickHouse, and more) and is much harder to maintain.",
          },
        },
        {
          "@type": "Question",
          name: "Can I migrate from PostHog to Rybbit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Just add Rybbit's script tag to your site and data starts flowing immediately. You can run both tools in parallel during the transition. Since Rybbit uses a different data model, historical PostHog data won't transfer, but new data collection begins instantly.",
          },
        },
      ],
    },
  ],
};

export default function PostHog() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="PostHog"
        sections={posthogComparisonData}
        subtitle={posthogExtendedData.subtitle}
        introHeading={posthogExtendedData.introHeading}
        introParagraphs={posthogExtendedData.introParagraphs}
        chooseRybbit={posthogExtendedData.chooseRybbit}
        chooseCompetitor={posthogExtendedData.chooseCompetitor}
        rybbitPricing={posthogExtendedData.rybbitPricing}
        competitorPricing={posthogExtendedData.competitorPricing}
        faqItems={posthogExtendedData.faqItems}
        relatedResources={posthogExtendedData.relatedResources}
      />
    </>
  );
}
