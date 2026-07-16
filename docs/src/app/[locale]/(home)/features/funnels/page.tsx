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
  title: "Funnels - Rybbit | Conversion Funnel Analytics",
  description:
    "Visualize your conversion paths and find exactly where visitors drop off. Build multi-step funnels with page paths or custom events. No sampling, real-time data.",
  openGraph: {
    title: "Funnels - Rybbit",
    description:
      "Find where users drop off. Build conversion funnels with real-time data and zero sampling.",
    type: "website",
    url: "https://rybbit.com/features/funnels",
    images: [
      createOGImageUrl(
        "Conversion Funnels",
        "Find where users drop off. Build conversion funnels with real-time data.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Funnels - Rybbit",
    description:
      "Find where users drop off. Build conversion funnels with real-time data.",
    images: [
      createOGImageUrl(
        "Conversion Funnels",
        "Find where users drop off. Build conversion funnels with real-time data.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/funnels",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/funnels",
      name: "Rybbit Funnels",
      description: "Conversion funnel analytics for your website or product.",
      url: "https://rybbit.com/features/funnels",
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

export default function FunnelsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="funnels"
        headline="Where do users drop off?"
        subtitle="Build multi-step conversion funnels to visualize your user flow and pinpoint exactly where you're losing conversions."
        badgeText="Funnels"
        demoUrl="https://demo.rybbit.com/81/funnels"
        demoCaption="Live funnels demo — see real conversion data"
        introParagraphs={[
          <>
            You&apos;re driving traffic to your site, but <strong className="text-neutral-900 dark:text-white">how many visitors actually complete the journey</strong> from landing page to signup, onboarding to activation, or browse to purchase? Without funnel analysis, you&apos;re flying blind — optimizing pages that might not be the real bottleneck.
          </>,
          <>
            Rybbit funnels give you a <strong className="text-neutral-900 dark:text-white">step-by-step breakdown of your conversion flow</strong> with precise drop-off percentages at every stage. No sampling, no estimation — every event is counted. Mix page paths and custom events freely to model any conversion flow, from a simple two-step signup to a complex multi-stage onboarding.
          </>,
          <>
            Combined with <strong className="text-neutral-900 dark:text-white">session replay and user journey mapping</strong>, funnels become even more powerful. Spot the drop-off in your funnel, then watch the sessions where users left to understand <em>why</em>. It&apos;s the difference between knowing you have a problem and knowing how to fix it.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Stop guessing where users drop off"
        ctaDescription="Build conversion funnels in minutes. See real-time drop-off data without sampling."
      />
    </>
  );
}
