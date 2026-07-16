import { ComparisonPage } from "../components/ComparisonPage";
import { fathomComparisonData, fathomExtendedData } from "./comparison-data";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Fathom: Open-Source Privacy Alternative",
  description:
    "Compare Rybbit and Fathom analytics. Both prioritize privacy, but Rybbit offers more features like session replay, funnels, and open-source flexibility.",
  openGraph: {
    title: "Rybbit vs Fathom: More Features, Same Privacy Focus",
    description: "Fathom is simple. Rybbit is simple AND powerful. Compare session replay, funnels, and more.",
    type: "website",
    url: "https://rybbit.com/compare/fathom",
    images: [createOGImageUrl("Rybbit vs Fathom: More Features, Same Privacy Focus", "Fathom is simple. Rybbit is simple AND powerful. Compare session replay, funnels, and more.", "Compare")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Fathom Analytics",
    description: "Privacy-first analytics compared. See which offers more value.",
    images: [createOGImageUrl("Rybbit vs Fathom Analytics", "Privacy-first analytics compared. See which offers more value.", "Compare")],
  },
  alternates: {
    canonical: "https://rybbit.com/compare/fathom",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/compare/fathom",
      name: "Rybbit vs Fathom Comparison",
      description: "Compare Rybbit and Fathom analytics platforms",
      url: "https://rybbit.com/compare/fathom",
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
          name: "Is Rybbit open source while Fathom is not?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit is fully open source under the AGPL v3 license, meaning you can inspect the code, self-host it, and verify exactly how your data is handled. Fathom is proprietary and closed-source, so you have to trust their claims about data handling.",
          },
        },
        {
          "@type": "Question",
          name: "What features does Rybbit have that Fathom doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit includes session replay, funnel analysis, user journey visualization (Sankey diagrams), Web Vitals monitoring, error tracking, user profiles, and sessions tracking. Fathom focuses on basic pageview and conversion analytics.",
          },
        },
        {
          "@type": "Question",
          name: "How does pricing compare between Rybbit and Fathom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Rybbit starts at $19/month with events-based pricing and a 7-day free trial. Fathom starts at $15/month with pageview-based pricing. Rybbit includes significantly more features at a comparable price point, including session replay, funnels, and error tracking.",
          },
        },
        {
          "@type": "Question",
          name: "Can I self-host Rybbit like I can with other tools?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Rybbit is fully self-hostable. Fathom does not offer self-hosting at all. If data sovereignty and infrastructure control matter to you, Rybbit gives you the option to run everything on your own servers.",
          },
        },
        {
          "@type": "Question",
          name: "Is it easy to switch from Fathom to Rybbit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Just add Rybbit's script tag to your site and data starts collecting immediately. You can run both in parallel during the transition. The setup takes less than 5 minutes.",
          },
        },
      ],
    },
  ],
};

export default function Fathom() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Fathom"
        sections={fathomComparisonData}
        subtitle={fathomExtendedData.subtitle}
        introHeading={fathomExtendedData.introHeading}
        introParagraphs={fathomExtendedData.introParagraphs}
        chooseRybbit={fathomExtendedData.chooseRybbit}
        chooseCompetitor={fathomExtendedData.chooseCompetitor}
        rybbitPricing={fathomExtendedData.rybbitPricing}
        competitorPricing={fathomExtendedData.competitorPricing}
        faqItems={fathomExtendedData.faqItems}
        relatedResources={fathomExtendedData.relatedResources}
      />
    </>
  );
}
