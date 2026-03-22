import { ComparisonPage } from "../components/ComparisonPage";
import { cloudflareAnalyticsComparisonData, cloudflareAnalyticsExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Cloudflare Analytics: Full-Featured Alternative",
  description:
    "Compare Rybbit and Cloudflare Web Analytics. While Cloudflare is free and basic, Rybbit offers advanced features like session replay, funnels, and custom events.",
  openGraph: {
    title: "Rybbit vs Cloudflare Analytics: Basic vs Full-Featured",
    description: "Cloudflare is free but limited. Rybbit offers the full analytics experience. Compare features.",
    type: "website",
    url: "https://rybbit.com/compare/cloudflare-analytics",
    images: [createOGImageUrl("Rybbit vs Cloudflare Analytics: Basic vs Full-Featured", "Cloudflare is free but limited. Rybbit offers the full analytics experience. Compare features.", "Compare")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Cloudflare Analytics",
    description: "Free basic analytics vs full-featured platform. See the difference.",
    images: [createOGImageUrl("Rybbit vs Cloudflare Analytics", "Free basic analytics vs full-featured platform. See the difference.", "Compare")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/cloudflare-analytics",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/cloudflare-analytics",
      name: "Rybbit vs Cloudflare Analytics Comparison",
      description: "Compare Rybbit and Cloudflare Web Analytics",
      url: "https://rybbit.com/compare/cloudflare-analytics",
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
          name: "Why is Cloudflare Analytics data inaccurate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cloudflare Analytics samples only about 10% of your traffic and extrapolates the rest. This means visitor counts are often significantly overcounted and you can't trust the exact numbers. Rybbit processes 100% of your events with no sampling.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need Cloudflare CDN to use Cloudflare Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Cloudflare Analytics requires routing your DNS through Cloudflare. Rybbit works with any website regardless of CDN or hosting provider. Just add a single script tag.",
          },
        },
        {
          "@type": "Question",
          name: "What features does Cloudflare Analytics lack?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cloudflare Analytics doesn't support custom events, conversion goals, UTM campaign tracking, session replay, funnels, user journeys, bounce rate, visit duration, entry/exit pages, or an API. It only provides basic traffic metrics with sampled data.",
          },
        },
        {
          "@type": "Question",
          name: "How long does Cloudflare keep my data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cloudflare retains analytics data for only 6 months. Rybbit retains data for 2-5+ years depending on your plan, and you can export your data at any time.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use Rybbit alongside Cloudflare Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Many teams add Rybbit for detailed analytics while keeping Cloudflare for basic CDN-level traffic monitoring. Just add Rybbit's script tag to your site, and it works alongside any other analytics tool.",
          },
        },
      ],
    },
  ],
};

export default function CloudflareAnalytics() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Cloudflare Analytics"
        sections={cloudflareAnalyticsComparisonData}
        subtitle={cloudflareAnalyticsExtendedData.subtitle}
        introHeading={cloudflareAnalyticsExtendedData.introHeading}
        introParagraphs={cloudflareAnalyticsExtendedData.introParagraphs}
        chooseRybbit={cloudflareAnalyticsExtendedData.chooseRybbit}
        chooseCompetitor={cloudflareAnalyticsExtendedData.chooseCompetitor}
        rybbitPricing={cloudflareAnalyticsExtendedData.rybbitPricing}
        competitorPricing={cloudflareAnalyticsExtendedData.competitorPricing}
        faqItems={cloudflareAnalyticsExtendedData.faqItems}
        relatedResources={cloudflareAnalyticsExtendedData.relatedResources}
      />
    </>
  );
}
