import { createOGImageUrl } from "@/lib/metadata";
import type { Metadata } from "next";
import { FeaturePage } from "../components/FeaturePage";
import {
  capabilities,
  faqItems,
  howItWorks,
  relatedFeatures,
  whoUses,
} from "./feature-data";

export const metadata: Metadata = {
  title: "Retention - Rybbit | Cohort Retention Analysis",
  description:
    "Understand user retention with cohort analysis. Color-coded retention tables, daily or weekly cohorts, and flexible time ranges. Privacy-first, no cookies required.",
  openGraph: {
    title: "Retention - Rybbit",
    description:
      "Cohort retention analysis. See which users come back and when they stop.",
    type: "website",
    url: "https://rybbit.com/features/retention",
    images: [
      createOGImageUrl(
        "Retention Analysis",
        "Cohort retention analysis. See which users come back and when they stop.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Retention - Rybbit",
    description:
      "Cohort retention analysis. See which users come back and when they stop.",
    images: [
      createOGImageUrl(
        "Retention Analysis",
        "Cohort retention analysis. See which users come back and when they stop.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/retention",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/retention",
      name: "Rybbit Retention Analysis",
      description: "Cohort-based retention analysis for websites and products.",
      url: "https://rybbit.com/features/retention",
      isPartOf: {
        "@type": "WebSite",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};

export default function RetentionPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="retention"
        headline="Are your users coming back?"
        subtitle="Cohort retention analysis that shows you exactly when users return — and when they stop. The clearest signal of product-market fit."
        badgeText="Retention"
        demoUrl="https://demo.rybbit.com/81/retention"
        demoCaption="Live retention demo — real cohort analysis data"
        introParagraphs={[
          <>
            Acquisition numbers are vanity metrics if users don&apos;t come back. <strong className="text-neutral-900 dark:text-white">Retention is the single most important metric</strong> for understanding whether your product or content is delivering real value. If users return, you&apos;re building something that matters. If they don&apos;t, no amount of traffic will save you.
          </>,
          <>
            Rybbit&apos;s retention analysis groups users into <strong className="text-neutral-900 dark:text-white">cohorts by their first visit date</strong> and tracks what percentage return on each subsequent day or week. The result is a color-coded heatmap that makes it instantly obvious whether your retention is improving, degrading, or holding steady.
          </>,
          <>
            Filter by any dimension to compare retention across segments. Do users from organic search retain better than paid? Do mobile users come back as often as desktop? <strong className="text-neutral-900 dark:text-white">Segment your retention data</strong> to find the channels and experiences that build lasting engagement — all without cookies and fully GDPR compliant.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Measure what really matters"
        ctaDescription="Cohort retention analysis that works out of the box. No cookies, no setup, just clarity."
      />
    </>
  );
}
