import { ComparisonPage } from "../components/ComparisonPage";
import { plausibleComparisonData, plausibleExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Plausible: More Features, Same Privacy",
  description:
    "Compare Rybbit and Plausible analytics. Both are privacy-first, but Rybbit offers more features like session replay, funnels, and user journeys at competitive pricing.",
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
            text: "Both Rybbit and Plausible are privacy-first analytics platforms, but Rybbit offers more advanced features like session replay, funnels, user journeys, and error tracking while maintaining simplicity.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit have features Plausible doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit includes session replay, funnel analysis, user journey visualization (Sankey diagrams), Web Vitals monitoring, error tracking, and public dashboards that Plausible doesn't offer.",
          },
        },
        {
          "@type": "Question",
          name: "Which is more affordable, Rybbit or Plausible?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Plausible starts at $9/month for 10k pageviews, while Rybbit starts at $19/month for events-based pricing. Rybbit includes more features at each price point, including session replay, funnels, and error tracking.",
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
        faqItems={plausibleExtendedData.faqItems}
        relatedResources={plausibleExtendedData.relatedResources}
      />
    </>
  );
}
