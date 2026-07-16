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
  title: "Error Tracking - Rybbit | JavaScript Error Monitoring",
  description:
    "Catch JavaScript errors in production automatically. Error aggregation, trend sparklines, full context, and session replay integration. No separate tool required.",
  openGraph: {
    title: "Error Tracking - Rybbit",
    description:
      "Automatic JavaScript error monitoring built into your analytics. No separate tool required.",
    type: "website",
    url: "https://rybbit.com/features/error-tracking",
    images: [
      createOGImageUrl(
        "Error Tracking",
        "Automatic JavaScript error monitoring built into your analytics.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Error Tracking - Rybbit",
    description:
      "Automatic JavaScript error monitoring built into your analytics.",
    images: [
      createOGImageUrl(
        "Error Tracking",
        "Automatic JavaScript error monitoring built into your analytics.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/error-tracking",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/error-tracking",
      name: "Rybbit Error Tracking",
      description: "JavaScript error monitoring for production websites.",
      url: "https://rybbit.com/features/error-tracking",
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

export default function ErrorTrackingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="error-tracking"
        headline="Catch errors before users report them"
        subtitle="Automatic JavaScript error monitoring built right into your analytics. See what's breaking, how often, and for whom — without adding another tool."
        badgeText="Error Tracking"
        demoUrl="https://demo.rybbit.com/81/errors"
        demoCaption="Live error tracking demo — real JavaScript error data"
        introParagraphs={[
          <>
            Your users aren&apos;t going to report every error they encounter. Most will just leave. <strong className="text-neutral-900 dark:text-white">Error tracking catches what your users don&apos;t tell you</strong> — unhandled exceptions, failed API calls, and broken UI states that silently erode trust and conversion rates.
          </>,
          <>
            Rybbit captures JavaScript errors automatically and <strong className="text-neutral-900 dark:text-white">aggregates them by type</strong> so you see the signal, not the noise. Each error type shows its frequency trend as a sparkline, making it instantly clear whether an error is new, growing, or being resolved. Click into any error for full details and context.
          </>,
          <>
            The real power is the <strong className="text-neutral-900 dark:text-white">integration with session replay</strong>. When you spot an error, you can watch the exact user session where it occurred — see what the user was doing, what they clicked, and what happened after the error. No more &ldquo;works on my machine&rdquo; — just full context, instantly.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Stop errors from going unnoticed"
        ctaDescription="JavaScript error monitoring built into your analytics. Catch, aggregate, and debug — all in one place."
      />
    </>
  );
}
