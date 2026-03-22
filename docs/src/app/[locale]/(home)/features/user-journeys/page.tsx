import { createOGImageUrl } from "@/lib/metadata";
import type { Metadata } from "next";
import { FeaturePage } from "../components/FeaturePage";
import {
  capabilities,
  faqItems,
  howItWorks,
  relatedFeatures,
  whoUses,
} from "./feature-data";

export const metadata: Metadata = {
  title: "User Journeys - Rybbit | Sankey Navigation Flow Diagrams",
  description:
    "Visualize how users navigate your site with interactive Sankey diagrams. See entry points, exit pages, and the most common paths between them.",
  openGraph: {
    title: "User Journeys - Rybbit",
    description:
      "See how users actually navigate your site with interactive Sankey flow diagrams.",
    type: "website",
    url: "https://rybbit.com/features/user-journeys",
    images: [
      createOGImageUrl(
        "User Journeys",
        "See how users actually navigate your site with interactive Sankey flow diagrams.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "User Journeys - Rybbit",
    description:
      "See how users actually navigate your site with interactive Sankey flow diagrams.",
    images: [
      createOGImageUrl(
        "User Journeys",
        "See how users actually navigate your site with interactive Sankey flow diagrams.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/user-journeys",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/user-journeys",
      name: "Rybbit User Journeys",
      description:
        "Interactive Sankey diagrams showing user navigation flows.",
      url: "https://rybbit.com/features/user-journeys",
      isPartOf: {
        "@type": "WebSite",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};

export default function UserJourneysPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="user-journeys"
        headline="Map how users really navigate"
        subtitle="Interactive Sankey diagrams that reveal the actual paths users take through your site — from landing page to conversion and beyond."
        badgeText="User Journeys"
        demoUrl="https://demo.rybbit.com/81/journeys"
        demoCaption="Live user journeys demo — interactive Sankey diagrams from real traffic"
        introParagraphs={[
          <>
            You designed your site with a specific flow in mind. But do users actually follow it? <strong className="text-neutral-900 dark:text-white">User journeys show you the real navigation patterns</strong> — the paths users take, the pages they skip, and the detours they make before reaching your goal.
          </>,
          <>
            Unlike funnels, which track a predefined sequence, user journeys are <strong className="text-neutral-900 dark:text-white">exploratory</strong>. They reveal paths you didn&apos;t design for — the blog post that accidentally became your best conversion page, the documentation section that&apos;s acting as a landing page, or the settings page where users get stuck.
          </>,
          <>
            Rybbit renders your journey data as <strong className="text-neutral-900 dark:text-white">interactive Sankey diagrams</strong> where flow thickness represents user volume. Hover over any path to see exact numbers. Filter by wildcards to group similar pages. Adjust depth from 2 to 6 steps to zoom in or out. It works out of the box with <strong className="text-neutral-900 dark:text-white">zero setup</strong> — just install Rybbit and your journey data is ready.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Discover how users really navigate"
        ctaDescription="Interactive Sankey diagrams from your pageview data. Zero setup required."
      />
    </>
  );
}
