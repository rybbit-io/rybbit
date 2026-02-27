import { ComparisonPage } from "../components/ComparisonPage";
import { cloudflareAnalyticsComparisonData } from "./comparison-data";
import { CloudflareAnalyticsComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Cloudflare Analytics: Full Comparison 2025",
  description:
    "Compare Rybbit and Cloudflare Web Analytics. While Cloudflare is free and basic, Rybbit offers advanced features like session replay, funnels, and custom events.",
  openGraph: {
    title: "Rybbit vs Cloudflare Analytics: Basic vs Full-Featured",
    description: "Cloudflare is free but limited. Rybbit offers the full analytics experience. Compare features.",
    type: "website",
    url: "https://rybbit.com/compare/cloudflare-analytics",
    images: [createOGImageUrl("Rybbit vs Cloudflare Analytics: Basic vs Full-Featured", "Cloudflare is free but limited. Rybbit offers the full analytics experience. Compare features.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Cloudflare Analytics",
    description: "Free basic analytics vs full-featured platform. See the difference.",
    images: [createOGImageUrl("Rybbit vs Cloudflare Analytics", "Free basic analytics vs full-featured platform. See the difference.")],
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
          name: "Is Rybbit better than Cloudflare Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit offers significantly more features than Cloudflare Web Analytics including session replay, funnels, custom events, user journeys, and conversion tracking. Cloudflare is free but limited to basic pageview metrics.",
          },
        },
        {
          "@type": "Question",
          name: "What features does Rybbit have that Cloudflare doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit includes session replay, funnel analysis, custom event tracking, user journey visualization, Web Vitals monitoring, error tracking, goals and conversions, and public dashboards. Cloudflare only provides basic traffic metrics.",
          },
        },
        {
          "@type": "Question",
          name: "Should I switch from Cloudflare Analytics to Rybbit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If you need more than basic pageview data, yes. Rybbit provides actionable insights with session replay, conversion tracking, and user behavior analysis that Cloudflare doesn't offer.",
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
        comparisonContent={<CloudflareAnalyticsComparisonContent />}
      />
    </>
  );
}
