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
  title: "Custom Events - Rybbit | Event Tracking & Analytics",
  description:
    "Track signups, purchases, clicks, and any user interaction. Custom properties, real-time event stream, autocapture, and full API access. One line of code.",
  openGraph: {
    title: "Custom Events - Rybbit",
    description:
      "Track any user interaction with one line of code. Custom properties, real-time stream, autocapture.",
    type: "website",
    url: "https://rybbit.com/features/custom-events",
    images: [
      createOGImageUrl(
        "Custom Events",
        "Track any user interaction with one line of code. Custom properties, real-time stream, autocapture.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Events - Rybbit",
    description:
      "Track any user interaction with one line of code. Custom properties, real-time stream, autocapture.",
    images: [
      createOGImageUrl(
        "Custom Events",
        "Track any user interaction with one line of code.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/custom-events",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/custom-events",
      name: "Rybbit Custom Events",
      description: "Custom event tracking for websites and products.",
      url: "https://rybbit.com/features/custom-events",
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

export default function CustomEventsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="custom-events"
        headline="Track every interaction that matters"
        subtitle="One function call to track signups, purchases, clicks, and any user action. Attach custom properties, view real-time streams, and power your funnels and goals."
        badgeText="Custom Events"
        demoUrl="https://demo.rybbit.com/81/events"
        demoCaption="Live events demo — real-time event stream and analytics"
        introParagraphs={[
          <>
            Pageviews tell you <em>where</em> users go. Custom events tell you <strong className="text-neutral-900 dark:text-white">what they do</strong>. Every button click, form submission, signup, purchase, feature toggle, and video play can be tracked with a single function call — <code className="bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm">rybbit.event(&apos;name&apos;, &#123; props &#125;)</code>.
          </>,
          <>
            Attach <strong className="text-neutral-900 dark:text-white">custom properties</strong> to any event — purchase amounts, plan types, feature names, or any metadata your team needs. Then filter, break down, and trend your events by those properties. Want to know which pricing plan gets the most upgrades from mobile users in Germany? One click.
          </>,
          <>
            Custom events aren&apos;t just for dashboards. They <strong className="text-neutral-900 dark:text-white">power your entire analytics stack</strong> — use them as funnel steps, goal triggers, and filter conditions. Combined with autocapture (which tracks clicks and form submissions automatically), you get complete behavioral data with <strong className="text-neutral-900 dark:text-white">minimal instrumentation effort</strong>.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Track what users actually do"
        ctaDescription="Custom events with one line of code. Properties, trends, and real-time streams included."
      />
    </>
  );
}
