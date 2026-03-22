import { ComparisonPage } from "../components/ComparisonPage";
import { umamiComparisonData, umamiExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Umami: Open-Source Analytics Alternative",
  description:
    "Compare Rybbit and Umami analytics. Both are open-source and privacy-focused, but Rybbit offers advanced features like session replay, funnels, and a managed cloud option.",
  openGraph: {
    title: "Rybbit vs Umami: Open-Source Analytics Head-to-Head",
    description: "Two open-source analytics platforms compared. See which offers more features and flexibility.",
    type: "website",
    url: "https://rybbit.com/compare/umami",
    images: [createOGImageUrl("Rybbit vs Umami: Open-Source Analytics Head-to-Head", "Two open-source analytics platforms compared. See which offers more features and flexibility.", "Compare")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Umami Comparison",
    description: "Open-source analytics showdown. Compare features, hosting options, and more.",
    images: [createOGImageUrl("Rybbit vs Umami Comparison", "Open-source analytics showdown. Compare features, hosting options, and more.", "Compare")],
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
      mainEntity: [
        {
          "@type": "Question",
          name: "How is Rybbit different from Umami?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are open-source and privacy-first, but Rybbit includes advanced features Umami lacks: session replay, error tracking, Web Vitals monitoring, real-time globe view, and organization support. Rybbit also uses ClickHouse for better performance at scale.",
          },
        },
        {
          "@type": "Question",
          name: "Can I migrate from Umami to Rybbit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Just add Rybbit's script tag to your site and data starts flowing immediately. You can run both tools in parallel during the transition. Historical Umami data won't transfer, but new data collection begins instantly.",
          },
        },
        {
          "@type": "Question",
          name: "Which is easier to self-host?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are straightforward to self-host with Docker. Umami supports PostgreSQL/MySQL which may be more familiar. Rybbit uses ClickHouse which offers better analytics query performance at scale but is a less common database.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit have a larger script than Umami?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Rybbit's script is 18KB compared to Umami's 2KB. The additional size enables features like session replay, error tracking, and Web Vitals monitoring. Both are small enough to have negligible impact on page load.",
          },
        },
        {
          "@type": "Question",
          name: "Are both GDPR compliant?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Both Rybbit and Umami are cookie-free and don't collect personal data. Rybbit adds an extra privacy option with daily rotating salt for user ID hashing, ensuring visitors can't be tracked across days.",
          },
        },
      ],
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
        faqItems={umamiExtendedData.faqItems}
        relatedResources={umamiExtendedData.relatedResources}
      />
    </>
  );
}
