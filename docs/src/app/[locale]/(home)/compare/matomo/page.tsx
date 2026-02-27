import { ComparisonPage } from "../components/ComparisonPage";
import { matomoComparisonData } from "./comparison-data";
import { MatomoComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Matomo: Open-Source Analytics Comparison 2025",
  description:
    "Compare Rybbit and Matomo analytics. See how Rybbit offers simpler setup, modern UI, privacy by default, and zero maintenance vs Matomo's complex PHP-based system.",
  openGraph: {
    title: "Rybbit vs Matomo: Which Analytics Platform is Right for You?",
    description: "Side-by-side comparison of Rybbit and Matomo. Modern, privacy-first analytics vs legacy PHP system.",
    type: "website",
    url: "https://rybbit.com/compare/matomo",
    images: [createOGImageUrl("Rybbit vs Matomo: Which Analytics Platform is Right for You?", "Side-by-side comparison of Rybbit and Matomo. Modern, privacy-first analytics vs legacy PHP system.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Matomo Comparison",
    description: "Compare Rybbit and Matomo analytics. See which open-source platform fits your needs.",
    images: [createOGImageUrl("Rybbit vs Matomo Comparison", "Compare Rybbit and Matomo analytics. See which open-source platform fits your needs.")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/matomo",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/matomo",
      name: "Rybbit vs Matomo Comparison",
      description: "Compare Rybbit and Matomo analytics platforms",
      url: "https://rybbit.com/compare/matomo",
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
          name: "How does Rybbit compare to Matomo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit offers a modern, simpler alternative to Matomo with privacy by default, zero maintenance cloud hosting, and a beautiful single-page dashboard. While both are open-source, Rybbit uses modern technology (Next.js, ClickHouse) vs Matomo's legacy PHP stack.",
          },
        },
        {
          "@type": "Question",
          name: "Is Rybbit easier to use than Matomo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Matomo has 70+ reports across 12 sections, inheriting Google Analytics complexity. Rybbit provides all essential metrics on a single dashboard with no training required.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit require cookies like Matomo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Rybbit is cookie-free by default and requires no consent banners. Matomo uses cookies by default and requires configuration to achieve GDPR compliance.",
          },
        },
      ],
    },
  ],
};

export default function Matomo() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Matomo"
        sections={matomoComparisonData}
        comparisonContent={<MatomoComparisonContent />}
      />
    </>
  );
}
