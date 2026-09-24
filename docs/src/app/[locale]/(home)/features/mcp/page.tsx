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
  title: "MCP Server - Rybbit | Analytics for AI Assistants",
  description:
    "Connect Claude, Cursor, Codex, and any MCP client to your analytics. 39 tools for querying traffic, managing goals and funnels, and running read-only SQL, with dashboard-grade permissions.",
  openGraph: {
    title: "MCP Server - Rybbit",
    description:
      "Analytics for AI assistants. Query traffic, manage goals, and run read-only SQL from Claude, Cursor, Codex, and any MCP client.",
    type: "website",
    url: "https://rybbit.com/features/mcp",
    images: [
      createOGImageUrl(
        "MCP Server",
        "Analytics for AI assistants. Query traffic and manage your sites from any MCP client.",
        "Features"
      ),
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Server - Rybbit",
    description:
      "Analytics for AI assistants. Query traffic, manage goals, and run read-only SQL from Claude, Cursor, Codex, and any MCP client.",
    images: [
      createOGImageUrl(
        "MCP Server",
        "Analytics for AI assistants. Query traffic and manage your sites from any MCP client.",
        "Features"
      ),
    ],
  },
  alternates: {
    canonical: "https://rybbit.com/features/mcp",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://rybbit.com/features/mcp",
      name: "Rybbit MCP Server",
      description:
        "Hosted Model Context Protocol server that connects AI assistants to Rybbit analytics.",
      url: "https://rybbit.com/features/mcp",
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

export default function McpPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <FeaturePage
        featureName="mcp"
        headline="Ask your analytics anything"
        subtitle="Rybbit's hosted MCP server connects Claude, Cursor, Codex, and any MCP client to your analytics: query traffic, manage goals and funnels, even run read-only SQL, with the same permissions as your dashboard."
        badgeText="MCP Server"
        introParagraphs={[
          <>
            Dashboards answer the questions someone thought to build. The Rybbit{" "}
            <strong className="text-neutral-900 dark:text-white">Model Context Protocol server</strong>{" "}
            answers the ones you ask: connect an AI assistant and it can explore your traffic, behavior, errors, and performance data through the same API the dashboard uses, in plain language, from wherever you already work.
          </>,
          <>
            This isn&apos;t a read-only feed. <strong className="text-neutral-900 dark:text-white">39 tools</strong>{" "}
            span analytics queries, live stats, sessions and raw events, read-only ClickHouse SQL, and management of sites, goals, funnels, user profiles, organization members, and teams. A coding agent can verify that the error you just fixed has stopped occurring in production, or check which pages matter before a refactor.
          </>,
          <>
            Access is as controlled as the dashboard itself: connect with{" "}
            <strong className="text-neutral-900 dark:text-white">OAuth or scoped, revocable API keys</strong>, and every tool call is authorized against your role, site access, and rate limits. Rybbit runs no AI model of its own. Your data goes only to the client you configure, on cloud or self-hosted.
          </>,
        ]}
        capabilities={capabilities}
        howItWorks={howItWorks}
        whoUses={whoUses}
        faqItems={faqItems}
        relatedFeatures={relatedFeatures}
        ctaTitle="Plug your analytics into your AI workflow"
        ctaDescription="One endpoint, 39 tools, dashboard-grade permissions. Works with Claude, Cursor, Codex, and any MCP client."
      />
    </>
  );
}
