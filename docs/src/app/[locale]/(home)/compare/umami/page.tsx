import { ComparisonPage } from "../components/ComparisonPage";
import { umamiComparisonData, umamiExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

const ogTitle = "Rybbit vs Umami: Open-Source Analytics Head-to-Head";
const ogDescription =
  "Two open-source, cookieless analytics tools compared on replay, heatmaps, error tracking, MCP, pricing, and self-hosting.";
const twitterTitle = "Rybbit vs Umami Comparison";
const twitterDescription = "Rybbit and Umami compared feature by feature, with current plan limits and prices.";

export const metadata: Metadata = {
  title: "Umami Alternative With Error Tracking & $39 Replay",
  description:
    "Looking for an Umami alternative? Rybbit is also open source and cookieless, and adds error tracking, five-layer bot filtering and replay from $39/mo.",
  openGraph: {
    title: ogTitle,
    description: ogDescription,
    type: "website",
    url: "https://rybbit.com/compare/umami",
    images: [createOGImageUrl(ogTitle, ogDescription, "Compare")],
  },
  twitter: {
    card: "summary_large_image",
    title: twitterTitle,
    description: twitterDescription,
    images: [createOGImageUrl(twitterTitle, twitterDescription, "Compare")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/umami",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/umami",
      name: "Rybbit vs Umami Comparison",
      description: "Compare Rybbit and Umami analytics platforms",
      url: "https://rybbit.com/compare/umami",
      isPartOf: {
        "@type": "WebSite",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    },
    {
      "@type": "FAQPage",
      // Built from the visible FAQ so the JSON-LD can never drift from the page text.
      mainEntity: umamiExtendedData.faqItems.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      })),
    },
  ],
};

export default function Umami() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Umami"
        sections={umamiComparisonData}
        subtitle={umamiExtendedData.subtitle}
        introHeading={umamiExtendedData.introHeading}
        introParagraphs={umamiExtendedData.introParagraphs}
        chooseRybbit={umamiExtendedData.chooseRybbit}
        chooseCompetitor={umamiExtendedData.chooseCompetitor}
        rybbitPricing={umamiExtendedData.rybbitPricing}
        competitorPricing={umamiExtendedData.competitorPricing}
        deepDive={umamiExtendedData.deepDive}
        otherAlternatives={umamiExtendedData.otherAlternatives}
        faqItems={umamiExtendedData.faqItems}
        relatedResources={umamiExtendedData.relatedResources}
      />
    </>
  );
}
