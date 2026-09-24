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
  title: "Bot Detection - Rybbit | Block & Inspect Bot Traffic",
  description:
    "Five-layer bot detection filters crawlers, scrapers, headless browsers, and AI agents from your analytics, and shows you everything it blocked in a dedicated report. Bots are never billed.",
  openGraph: {
    title: "Bot Detection - Rybbit",
    description:
      "Five-layer bot detection with a dedicated report. Filter crawlers, scrapers, and AI agents. See exactly what was blocked.",
    type: "website",
    url: "https://rybbit.com/features/bot-detection",
    images: [
      createOGImageUrl(
        "Bot Detection",
        "Five-layer bot detection with a dedicated report. See exactly what was blocked.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bot Detection - Rybbit",
    description:
      "Five-layer bot detection with a dedicated report. Filter crawlers, scrapers, and AI agents. See exactly what was blocked.",
    images: [
      createOGImageUrl(
        "Bot Detection",
        "Five-layer bot detection with a dedicated report. See exactly what was blocked.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/bot-detection",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/bot-detection",
      name: "Rybbit Bot Detection",
      description: "Multi-layer bot detection and filtering with a dedicated bot traffic report.",
      url: "https://rybbit.com/features/bot-detection",
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

export default function BotDetectionPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="bot-detection"
        headline="Analytics without the bots"
        subtitle="Five detection layers filter crawlers, scrapers, headless browsers, and AI agents before they pollute your data. And unlike silent filters, Rybbit shows you everything it blocked."
        badgeText="Bot Detection"
        demoUrl="https://demo.rybbit.com/81/bots"
        demoCaption="Live bot report: real bot traffic detected and filtered on this site"
        introParagraphs={[
          <>
            A meaningful share of your traffic isn&apos;t human: search crawlers, uptime monitors, scrapers, link previewers, and a fast-growing wave of AI agents. Left in your data, they inflate visitor counts, distort bounce rates, and quietly wreck conversion metrics. Rybbit checks{" "}
            <strong className="text-neutral-900 dark:text-white">every tracking request against five detection layers</strong>{" "}
            before it ever reaches your analytics.
          </>,
          <>
            Most analytics tools filter bots silently against a user-agent list, so you never know what was removed, or what slipped through. Rybbit stores a compact record of every filtered request and gives you a{" "}
            <strong className="text-neutral-900 dark:text-white">dedicated Bots report</strong>: total blocked requests, bot share of traffic, which detection layers matched, and breakdowns by page, referrer, country, device, and user-agent.
          </>,
          <>
            Filtered bots are excluded from dashboards, funnels, journeys, and session lists, and they{" "}
            <strong className="text-neutral-900 dark:text-white">never count toward your bill</strong>. One toggle per site, no changes to your tracking script.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Stop counting bots as visitors"
        ctaDescription="Five-layer detection, full visibility into what was filtered, and a bill that only counts humans."
      />
    </>
  );
}
