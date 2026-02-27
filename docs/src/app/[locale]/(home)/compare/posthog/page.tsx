import { ComparisonPage } from "../components/ComparisonPage";
import { posthogComparisonData } from "./comparison-data";
import { PostHogComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs PostHog: Analytics Platform Comparison 2025",
  description:
    "Compare Rybbit and PostHog. See why Rybbit's focused web analytics beats PostHog's complex product suite for teams wanting simplicity without sacrificing power.",
  openGraph: {
    title: "Rybbit vs PostHog: Focused Analytics vs Feature Bloat",
    description: "PostHog does everything. Rybbit does web analytics perfectly. Compare the approaches.",
    type: "website",
    url: "https://rybbit.com/compare/posthog",
    images: [createOGImageUrl("Rybbit vs PostHog: Focused Analytics vs Feature Bloat", "PostHog does everything. Rybbit does web analytics perfectly. Compare the approaches.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs PostHog Comparison",
    description: "Focused web analytics vs all-in-one platform. Which approach fits your needs?",
    images: [createOGImageUrl("Rybbit vs PostHog Comparison", "Focused web analytics vs all-in-one platform. Which approach fits your needs?")],
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
            text: "Rybbit focuses exclusively on web analytics with a clean, simple interface. PostHog is an all-in-one product suite with analytics, feature flags, A/B testing, and more. Rybbit is ideal for teams who want powerful web analytics without the complexity.",
          },
        },
        {
          "@type": "Question",
          name: "Is Rybbit simpler than PostHog?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit provides a single-page dashboard with all essential metrics visible at a glance. PostHog's extensive feature set requires more time to learn and configure.",
          },
        },
        {
          "@type": "Question",
          name: "Which is better for web analytics, Rybbit or PostHog?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "For pure web analytics, Rybbit offers a more focused and streamlined experience. PostHog is better suited for teams needing a full product analytics suite with feature flags and experimentation.",
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
        comparisonContent={<PostHogComparisonContent />}
      />
    </>
  );
}
