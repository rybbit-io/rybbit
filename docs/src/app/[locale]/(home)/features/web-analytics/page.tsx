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
  title: "Web Analytics - Rybbit | Privacy-First Website Analytics",
  description:
    "Real-time web analytics without cookies or consent banners. Track pageviews, visitors, traffic sources, and more with a single script. Open source and GDPR compliant.",
  openGraph: {
    title: "Web Analytics - Rybbit",
    description:
      "Real-time, privacy-first web analytics. One script, full dashboard. No cookies required.",
    type: "website",
    url: "https://rybbit.com/features/web-analytics",
    images: [
      createOGImageUrl(
        "Web Analytics",
        "Real-time, privacy-first web analytics. One script, full dashboard.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Analytics - Rybbit",
    description:
      "Real-time, privacy-first web analytics. One script, full dashboard.",
    images: [
      createOGImageUrl(
        "Web Analytics",
        "Real-time, privacy-first web analytics. One script, full dashboard.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/web-analytics",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/web-analytics",
      name: "Rybbit Web Analytics",
      description:
        "Real-time web analytics without cookies or consent banners.",
      url: "https://rybbit.com/features/web-analytics",
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

export default function WebAnalyticsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="web-analytics"
        headline="One script. Full dashboard."
        subtitle="Real-time web analytics without cookies, consent banners, or complexity. See your traffic, sources, and audience — all on a single page."
        badgeText="Web Analytics"
        demoUrl="https://demo.rybbit.com/81/main"
        demoCaption="Live demo — this is real data from a real site"
        introParagraphs={[
          <>
            Most analytics tools make you choose between <strong className="text-neutral-900 dark:text-white">power and simplicity</strong>. Google Analytics has hundreds of reports but takes a PhD to navigate. Simple tools show you numbers but can&apos;t tell you <em>why</em> they changed. Rybbit gives you both: a single, real-time dashboard with every metric that matters, plus the ability to click into any dimension and drill down instantly.
          </>,
          <>
            There are <strong className="text-neutral-900 dark:text-white">no cookies, no personal data collection, and no consent banners</strong>. Your tracking script is just 18KB — compared to Google Analytics&apos; 371KB. That means faster page loads and <strong className="text-neutral-900 dark:text-white">100% visitor capture</strong> since no one gets blocked by ad blockers or cookie rejections.
          </>,
          <>
            Whether you&apos;re monitoring a blog, a SaaS product, or a portfolio of client sites, Rybbit adapts. Filter by country, device, referrer, or any custom property. Compare date ranges. Share public dashboards. And because it&apos;s <strong className="text-neutral-900 dark:text-white">100% open source</strong>, you can self-host and own every byte of your data.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="See your analytics clearly"
        ctaDescription="One script. Real-time data. No cookies. Get started in under 5 minutes."
      />
    </>
  );
}
