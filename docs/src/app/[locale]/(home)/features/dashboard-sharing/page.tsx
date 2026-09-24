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
  title: "Dashboard Sharing - Rybbit | Public Dashboards, Private Links & Embeds",
  description:
    "Share your analytics your way: public dashboards, private read-only links, a full dashboard embed, or a live visitor widget. No viewer accounts needed.",
  openGraph: {
    title: "Dashboard Sharing - Rybbit",
    description:
      "Public dashboards, private links, dashboard embeds, and a live visitor widget. Share analytics without viewer accounts.",
    type: "website",
    url: "https://rybbit.com/features/dashboard-sharing",
    images: [
      createOGImageUrl(
        "Dashboard Sharing",
        "Public dashboards, private links, embeds, and a live visitor widget.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashboard Sharing - Rybbit",
    description:
      "Public dashboards, private links, dashboard embeds, and a live visitor widget. Share analytics without viewer accounts.",
    images: [
      createOGImageUrl(
        "Dashboard Sharing",
        "Public dashboards, private links, embeds, and a live visitor widget.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/dashboard-sharing",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/dashboard-sharing",
      name: "Rybbit Dashboard Sharing",
      description:
        "Public analytics dashboards, private read-only links, dashboard embeds, and a live visitor widget.",
      url: "https://rybbit.com/features/dashboard-sharing",
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

export default function DashboardSharingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="dashboard-sharing"
        headline="Your analytics, wherever you need them"
        subtitle="Make a dashboard public, hand out a private read-only link, or embed your stats on any site, as the full dashboard or a compact live visitor widget. No viewer accounts required."
        badgeText="Dashboard Sharing"
        demoUrl="https://demo.rybbit.com/81"
        demoCaption="This demo is a public Rybbit dashboard: exactly what viewers see when you share yours"
        introParagraphs={[
          <>
            Analytics that only you can log into is analytics going to waste. Clients want to see the campaign working, communities want proof of traction, and your own site might deserve a live visitor counter. Rybbit gives you{" "}
            <strong className="text-neutral-900 dark:text-white">four ways to share</strong>, each with its own clearly-drawn access boundary.
          </>,
          <>
            Go fully open with a <strong className="text-neutral-900 dark:text-white">public dashboard</strong>: one toggle and anyone can view your stats, read-only. Or keep it selective with a{" "}
            <strong className="text-neutral-900 dark:text-white">private link</strong>: a secret URL that gives clients and stakeholders the live dashboard without a Rybbit account, and without exposing anything publicly.
          </>,
          <>
            For your own site, embed the{" "}
            <strong className="text-neutral-900 dark:text-white">full dashboard in an iframe</strong> (themed light, dark, or system, with or without the sidebar), or drop in the{" "}
            <strong className="text-neutral-900 dark:text-white">live visitor widget</strong>: a compact card or inline pill with your accent color, no script tag, cached server-side so it never adds load.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Share your stats in minutes"
        ctaDescription="Public dashboards, private links, and embeds: all read-only, all live, no viewer accounts."
      />
    </>
  );
}
