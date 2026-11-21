import { ComparisonPage } from "../components/ComparisonPage";
import { plausibleComparisonData, plausibleExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Plausible: The Open Source Plausible Alternative",
  description:
    "Looking for a Plausible alternative? Rybbit is open source and cookieless too, with funnels and journeys on every plan, plus session replay and error tracking.",
  openGraph: {
    title: "Rybbit vs Plausible: Which Privacy-First Analytics Wins?",
    description: "Both respect privacy, but Rybbit offers more power. Compare session replay, funnels, and pricing.",
    type: "website",
    url: "https://rybbit.com/compare/plausible",
    images: [createOGImageUrl("Rybbit vs Plausible: Which Privacy-First Analytics Wins?", "Both respect privacy, but Rybbit offers more power. Compare session replay, funnels, and pricing.", "Compare")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Plausible Comparison",
    description: "Privacy-first analytics showdown. See which platform offers more value.",
    images: [createOGImageUrl("Rybbit vs Plausible Comparison", "Privacy-first analytics showdown. See which platform offers more value.", "Compare")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/plausible",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/plausible",
      name: "Rybbit vs Plausible Comparison",
      description: "Compare Rybbit and Plausible analytics platforms",
      url: "https://rybbit.com/compare/plausible",
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
          name: "How does Rybbit compare to Plausible?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are privacy-first and open source. Rybbit adds session replay, Web Vitals monitoring, error tracking, and user profiles, and includes funnels and user journeys on every plan, while Plausible reserves those for its Business plan.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit have features Plausible doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit includes session replay, Web Vitals monitoring, and error tracking, which Plausible doesn't offer, and it includes funnels and user journeys on every plan instead of only on a higher tier.",
          },
        },
        {
          "@type": "Question",
          name: "Which is more affordable, Rybbit or Plausible?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Plausible starts at $9/month for 10k pageviews, while Rybbit starts at $19/month for 100k events (pageviews, custom events, and more). Rybbit includes funnels, journeys, and error tracking on every plan; Plausible reserves funnels and journeys for its $19/month Business plan and doesn't offer session replay or error tracking at any price.",
          },
        },
        {
          "@type": "Question",
          name: "Can I self-host Rybbit like Plausible?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Rybbit is fully self-hostable under the AGPL v3 license. Both use ClickHouse for fast analytics queries. Rybbit's stack is TypeScript-based, while Plausible uses Elixir.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit have session replay?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, session replay is one of the biggest differentiators. Rybbit offers session replay on the Pro plan, allowing you to watch how users interact with your site. Plausible does not offer this feature at any price point.",
          },
        },
      ],
    },
  ],
};

export default function Plausible() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Plausible"
        sections={plausibleComparisonData}
        subtitle={plausibleExtendedData.subtitle}
        introHeading={plausibleExtendedData.introHeading}
        introParagraphs={plausibleExtendedData.introParagraphs}
        chooseRybbit={plausibleExtendedData.chooseRybbit}
        chooseCompetitor={plausibleExtendedData.chooseCompetitor}
        rybbitPricing={plausibleExtendedData.rybbitPricing}
        competitorPricing={plausibleExtendedData.competitorPricing}
        deepDive={plausibleExtendedData.deepDive}
        otherAlternatives={plausibleExtendedData.otherAlternatives}
        faqItems={plausibleExtendedData.faqItems}
        relatedResources={plausibleExtendedData.relatedResources}
      />
    </>
  );
}
