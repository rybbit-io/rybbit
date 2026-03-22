import { ComparisonPage } from "../components/ComparisonPage";
import { matomoComparisonData, matomoExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Matomo: Modern Analytics Alternative",
  description:
    "Compare Rybbit and Matomo analytics. See how Rybbit offers simpler setup, modern UI, privacy by default, and zero maintenance vs Matomo's complex PHP-based system.",
  openGraph: {
    title: "Rybbit vs Matomo: Which Analytics Platform is Right for You?",
    description: "Side-by-side comparison of Rybbit and Matomo. Modern, privacy-first analytics vs legacy PHP system.",
    type: "website",
    url: "https://rybbit.com/compare/matomo",
    images: [createOGImageUrl("Rybbit vs Matomo: Which Analytics Platform is Right for You?", "Side-by-side comparison of Rybbit and Matomo. Modern, privacy-first analytics vs legacy PHP system.", "Compare")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Matomo Comparison",
    description: "Compare Rybbit and Matomo analytics. See which open-source platform fits your needs.",
    images: [createOGImageUrl("Rybbit vs Matomo Comparison", "Compare Rybbit and Matomo analytics. See which open-source platform fits your needs.", "Compare")],
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
          name: "Is Rybbit really simpler than Matomo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Matomo has 70+ reports across 12 sections, inheriting Google Analytics-style complexity. Rybbit shows all essential metrics on a single intuitive dashboard. Your team can start using Rybbit immediately without training.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit require cookies like Matomo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Rybbit is cookie-free by default and never requires consent banners. Matomo uses cookies by default and requires configuration to achieve cookieless tracking, which can reduce its accuracy.",
          },
        },
        {
          "@type": "Question",
          name: "How does self-hosting compare?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit uses a modern stack (TypeScript, ClickHouse) and is straightforward to deploy with Docker. Matomo runs on PHP/MySQL, which is widely supported but requires ongoing maintenance, updates, and security patches. Rybbit also offers a managed cloud option.",
          },
        },
        {
          "@type": "Question",
          name: "Can I migrate from Matomo to Rybbit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Add Rybbit's script tag to your site and data starts flowing immediately. You can run both tools in parallel during the transition. Rybbit's simpler setup means you'll be collecting data within minutes.",
          },
        },
        {
          "@type": "Question",
          name: "Does Matomo have features Rybbit doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Matomo offers heatmaps, A/B testing, form analytics, and a custom report builder that Rybbit doesn't have. However, many of these require paid plugins. Rybbit focuses on delivering the analytics features most teams actually need, with a much simpler experience.",
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
        subtitle={matomoExtendedData.subtitle}
        introHeading={matomoExtendedData.introHeading}
        introParagraphs={matomoExtendedData.introParagraphs}
        chooseRybbit={matomoExtendedData.chooseRybbit}
        chooseCompetitor={matomoExtendedData.chooseCompetitor}
        rybbitPricing={matomoExtendedData.rybbitPricing}
        competitorPricing={matomoExtendedData.competitorPricing}
        faqItems={matomoExtendedData.faqItems}
        relatedResources={matomoExtendedData.relatedResources}
      />
    </>
  );
}
