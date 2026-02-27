import { ComparisonPage } from "../components/ComparisonPage";
import { umamiComparisonData } from "./comparison-data";
import { UmamiComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Rybbit vs Umami: Open-Source Analytics Comparison 2025",
  description:
    "Compare Rybbit and Umami analytics. Both are open-source and privacy-focused, but Rybbit offers advanced features like session replay, funnels, and a managed cloud option.",
  openGraph: {
    title: "Rybbit vs Umami: Open-Source Analytics Head-to-Head",
    description: "Two open-source analytics platforms compared. See which offers more features and flexibility.",
    type: "website",
    url: "https://rybbit.com/compare/umami",
    images: [createOGImageUrl("Rybbit vs Umami: Open-Source Analytics Head-to-Head", "Two open-source analytics platforms compared. See which offers more features and flexibility.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit vs Umami Comparison",
    description: "Open-source analytics showdown. Compare features, hosting options, and more.",
    images: [createOGImageUrl("Rybbit vs Umami Comparison", "Open-source analytics showdown. Compare features, hosting options, and more.")],
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
          name: "How does Rybbit compare to Umami?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are open-source, privacy-focused analytics platforms. Rybbit offers more advanced features like session replay, funnels, user journeys, and Web Vitals monitoring, plus a fully managed cloud option.",
          },
        },
        {
          "@type": "Question",
          name: "Does Rybbit offer more features than Umami?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Rybbit includes session replay, funnel analysis, user journey visualization, Web Vitals dashboard, error tracking, and public dashboards. Umami focuses on core analytics metrics.",
          },
        },
        {
          "@type": "Question",
          name: "Which is easier to self-host, Rybbit or Umami?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are relatively easy to self-host with Docker. Rybbit uses ClickHouse for better performance at scale, while Umami uses MySQL/PostgreSQL. Rybbit also offers a managed cloud option if you prefer not to self-host.",
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
        comparisonContent={<UmamiComparisonContent />}
      />
    </>
  );
}
