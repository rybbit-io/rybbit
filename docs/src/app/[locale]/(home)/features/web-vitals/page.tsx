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
  title: "Web Vitals - Rybbit | Core Web Vitals Monitoring",
  description:
    "Monitor LCP, FID/INP, and CLS from real users. Percentile analysis, device breakdowns, geographic performance maps, and time-series trends. No synthetic tests.",
  openGraph: {
    title: "Web Vitals - Rybbit",
    description:
      "Real user Core Web Vitals monitoring. LCP, FID/INP, CLS with percentile analysis and geographic breakdowns.",
    type: "website",
    url: "https://rybbit.com/features/web-vitals",
    images: [
      createOGImageUrl(
        "Web Vitals Monitoring",
        "Real user Core Web Vitals monitoring. LCP, FID/INP, CLS with percentile analysis.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Vitals - Rybbit",
    description:
      "Real user Core Web Vitals monitoring. LCP, FID/INP, CLS with percentile analysis.",
    images: [
      createOGImageUrl(
        "Web Vitals Monitoring",
        "Real user Core Web Vitals monitoring. LCP, FID/INP, CLS with percentile analysis.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/web-vitals",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/web-vitals",
      name: "Rybbit Web Vitals",
      description: "Core Web Vitals monitoring from real users.",
      url: "https://rybbit.com/features/web-vitals",
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

export default function WebVitalsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="web-vitals"
        headline="How fast is your site, really?"
        subtitle="Monitor Core Web Vitals from real users, not synthetic tests. LCP, FID/INP, and CLS with percentile analysis, device breakdowns, and geographic maps."
        badgeText="Web Vitals"
        demoUrl="https://demo.rybbit.com/81/performance"
        demoCaption="Live Web Vitals demo — real Core Web Vitals data from actual users"
        introParagraphs={[
          <>
            Lighthouse gives you a score. PageSpeed Insights gives you lab data. But neither tells you how your site <strong className="text-neutral-900 dark:text-white">actually performs for real visitors</strong> on real devices, real networks, and real browsers. Rybbit&apos;s Web Vitals monitoring measures Core Web Vitals from actual user sessions — the same metrics Google uses to determine your search ranking.
          </>,
          <>
            See your <strong className="text-neutral-900 dark:text-white">LCP, FID/INP, and CLS</strong> at the P75, P90, and P99 levels. Break them down by device type, browser, operating system, and geographic region. Spot that your mobile users in Southeast Asia have a 4-second LCP while desktop users in Europe see 1.2 seconds — then take targeted action.
          </>,
          <>
            Track performance <strong className="text-neutral-900 dark:text-white">over time with trend charts</strong> that make regressions instantly visible. Correlate performance changes with deployments. All data comes from real user monitoring with minimal overhead, and because it&apos;s built into Rybbit, there&apos;s no extra tool to manage or separate bill to pay.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Know your real performance"
        ctaDescription="Real user Web Vitals monitoring built into your analytics. No synthetic tests, no separate tool."
      />
    </>
  );
}
