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
  title: "Analytics API - Rybbit | REST API for Your Analytics Data",
  description:
    "Query every metric, ingest events server-side, and export raw data over REST. Prototype in the built-in API Playground, authenticate with scoped organization or personal keys, and build on your analytics.",
  openGraph: {
    title: "Analytics API - Rybbit",
    description:
      "Query every metric, ingest events server-side, and export raw data over REST, with a built-in playground and scoped API keys.",
    type: "website",
    url: "https://rybbit.com/features/api",
    images: [
      createOGImageUrl(
        "Analytics API",
        "Query every metric, ingest events, and export raw data over REST.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Analytics API - Rybbit",
    description:
      "Query every metric, ingest events server-side, and export raw data over REST, with a built-in playground and scoped API keys.",
    images: [
      createOGImageUrl(
        "Analytics API",
        "Query every metric, ingest events, and export raw data over REST.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/api",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/api",
      name: "Rybbit Analytics API",
      description:
        "REST API for querying analytics data, ingesting events server-side, and managing sites programmatically.",
      url: "https://rybbit.com/features/api",
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

export default function ApiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="api"
        headline="Build on your analytics"
        subtitle="A REST API over everything Rybbit collects: query any metric, ingest events from any platform, and pull raw data into your own systems. Prototype it all in the built-in playground."
        badgeText="Analytics API"
        introParagraphs={[
          <>
            Your analytics shouldn&apos;t be locked inside a dashboard. The Rybbit API exposes{" "}
            <strong className="text-neutral-900 dark:text-white">everything the dashboard shows as REST endpoints</strong>: overview stats, time series, breakdowns, sessions, user profiles, goals, funnels, errors, Web Vitals, and raw events. Build reports, internal tools, and product features on live data.
          </>,
          <>
            It works in both directions. Read endpoints power custom dashboards, scheduled digests, and warehouse syncs. The{" "}
            <strong className="text-neutral-900 dark:text-white">track endpoint ingests events from anywhere</strong> (backends, mobile apps, webhooks, CLI tools), with geolocation and user-agent parsing handled for you, and API-key requests trusted past bot detection. Management endpoints automate the rest: sites, members, teams, goals, and imports.
          </>,
          <>
            Start without writing code: the{" "}
            <strong className="text-neutral-900 dark:text-white">API Playground built into your dashboard</strong>{" "}
            lets you browse endpoints, adjust parameters visually, watch live responses with your own data, and copy working snippets. Authenticate with organization or personal keys, optionally restricted to just the permissions an integration needs.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Your data, your code"
        ctaDescription="Every metric as an endpoint, event ingestion from any platform, and a playground to prototype in."
      />
    </>
  );
}
