import { ComparisonPage } from "../components/ComparisonPage";
import { googleAnalyticsComparisonData } from "./comparison-data";
import { GoogleAnalyticsComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Google Analytics: Privacy-First Alternative 2025",
  description:
    "Compare Rybbit and Google Analytics. Discover why privacy-conscious businesses are switching from GA4 to Rybbit's open-source, cookie-free analytics.",
  openGraph: {
    title: "Rybbit vs Google Analytics: The Privacy-First Alternative",
    description:
      "Why thousands are switching from Google Analytics to Rybbit. Open-source, cookie-free, GDPR compliant.",
    type: "website",
    url: "https://rybbit.com/compare/google-analytics",
    images: [createOGImageUrl("Rybbit vs Google Analytics: The Privacy-First Alternative", "Why thousands are switching from Google Analytics to Rybbit. Open-source, cookie-free, GDPR compliant.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Google Analytics",
    description: "The privacy-first Google Analytics alternative. Compare features side-by-side.",
    images: [createOGImageUrl("Rybbit vs Google Analytics", "The privacy-first Google Analytics alternative. Compare features side-by-side.")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/google-analytics",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/google-analytics",
      name: "Rybbit vs Google Analytics Comparison",
      description: "Compare Rybbit and Google Analytics platforms",
      url: "https://rybbit.com/compare/google-analytics",
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
          name: "Why switch from Google Analytics to Rybbit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit offers privacy-first analytics without cookies, no consent banners needed, GDPR compliance by default, and a simpler interface. Unlike GA4's complex 150+ report system, Rybbit shows all essential metrics on a single dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "Is Rybbit GDPR compliant unlike Google Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit is GDPR compliant by default with no cookies, no personal data collection, and EU data storage. Google Analytics has faced GDPR issues in multiple EU countries due to data transfers to the US.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit offer the same features as GA4?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit offers all essential analytics features plus session replay, funnels, user journeys, and real-time data. While GA4 has more advanced enterprise features, Rybbit provides what most businesses actually need without the complexity.",
          },
        },
      ],
    },
  ],
};

export default function GoogleAnalytics() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Google Analytics"
        sections={googleAnalyticsComparisonData}
        comparisonContent={<GoogleAnalyticsComparisonContent />}
      />
    </>
  );
}
