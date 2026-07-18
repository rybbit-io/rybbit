import { createOGImageUrl } from "@/lib/metadata";
import type { Metadata } from "next";
import { FeaturePage } from "../features/components/FeaturePage";
import { capabilities, faqItems, howItWorks, relatedFeatures, whoUses } from "./persona-data";

export const metadata: Metadata = {
  title: "Web Analytics for Developers - Rybbit | Open Source, Self-Hosted, API-First",
  description:
    "AGPL-licensed analytics you can docker compose up. Full REST API with scoped keys, an MCP server for your agents, SDKs for web, Node, and React Native — and a script that won't hurt your Web Vitals.",
  openGraph: {
    title: "Rybbit for Developers",
    description:
      "Open source, self-hostable, API-first analytics. One script tag, then every number is queryable and yours.",
    type: "website",
    url: "https://rybbit.com/for-developers",
    images: [
      createOGImageUrl(
        "Rybbit for Developers",
        "Open source, self-hostable, API-first analytics.",
        "For Developers"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Analytics for Developers - Rybbit",
    description:
      "Open source, self-hostable, API-first analytics. One script tag, then every number is queryable and yours.",
    images: [
      createOGImageUrl(
        "Rybbit for Developers",
        "Open source, self-hostable, API-first analytics.",
        "For Developers"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/for-developers",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/for-developers",
      name: "Rybbit for Developers",
      description:
        "Open source, self-hostable, API-first web analytics for developers: Docker Compose deployment, REST API, MCP server, and SDKs.",
      url: "https://rybbit.com/for-developers",
      isPartOf: {
        "@type": "WebSite",
        name: "Rybbit",
        url: "https://rybbit.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map(faq => ({
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

export default function ForDevelopersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <FeaturePage
        featureName="for-developers"
        displayTitle="Your stack, your data"
        headline="Analytics built the way you'd build it"
        subtitle="Open source, self-hostable, API-first. One script tag or an npm install — then every number you see is queryable, exportable, and yours."
        badgeText="Rybbit for Developers"
        demoUrl="https://demo.rybbit.com/81/main"
        demoCaption="Live demo — real traffic on a real Rybbit instance."
        introParagraphs={[
          <>
            Google Analytics is a black box you can&apos;t inspect, can&apos;t self-host, and can&apos;t explain to
            your users. Most lightweight alternatives fix the bloat but stop at pageviews — the moment you want
            funnels, session replay, or an API, you&apos;re back to gluing tools together.
          </>,
          <>
            Rybbit is the whole thing, open. The entire platform is{" "}
            <strong className="text-neutral-900 dark:text-white">AGPL-3.0 on GitHub</strong> — including the cloud
            features — and runs on your own server with{" "}
            <strong className="text-neutral-900 dark:text-white">Docker Compose</strong>. Or skip the ops and use the
            EU-hosted cloud. Either way you get the same dashboard, the same features, and the same answer to
            &ldquo;where does my data live?&rdquo;: wherever you decided.
          </>,
          <>
            And it&apos;s built to be driven programmatically. A{" "}
            <strong className="text-neutral-900 dark:text-white">REST API covers everything</strong> the dashboard
            shows, API keys scope to exactly the resources you grant, and a hosted{" "}
            <strong className="text-neutral-900 dark:text-white">MCP server</strong> lets your coding agent query
            live traffic from the same session that ships the fix.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Ship it in the next ten minutes"
        ctaDescription="Add the script, watch data flow. Self-host free forever, or start on cloud for $0."
      />
    </>
  );
}
