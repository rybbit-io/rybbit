import { CodeCard } from "@/components/CodeCard";
import { CTASection } from "@/components/CTASection";
import { GitHubStarButton } from "@/components/GitHubStarButton";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { PersonaCrossLinks } from "@/components/persona/PersonaCrossLinks";
import { PersonaFaqSection } from "@/components/persona/PersonaFaqSection";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { TrackingSnippet } from "@/components/deco/TrackingSnippet";
import { createMetadata, createOGImageUrl } from "@/lib/metadata";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const pageTitle = "Rybbit for Developers | Open-Source, Self-Hostable Analytics";
const pageDescription =
  "One script tag or one npm package. A REST API for everything the dashboard shows, a hosted MCP server your AI agents can operate, and 100% open-source code you can self-host with Docker.";

export const metadata = createMetadata({
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "https://rybbit.com/for-developers",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "https://rybbit.com/for-developers",
    images: [createOGImageUrl("Rybbit for Developers", "Script tag, SDK, REST API, MCP server, and self-hosting — all open source.", "Solutions")],
  },
  twitter: {
    images: [createOGImageUrl("Rybbit for Developers", "Script tag, SDK, REST API, MCP server, and self-hosting — all open source.", "Solutions")],
  },
});

const mcpClients = [
  { name: "Claude Code", path: "/docs/mcp/claude-code" },
  { name: "Claude Desktop", path: "/docs/mcp/claude-desktop" },
  { name: "Codex", path: "/docs/mcp/codex" },
  { name: "Cursor", path: "/docs/mcp/cursor" },
  { name: "VS Code", path: "/docs/mcp/vscode" },
  { name: "opencode", path: "/docs/mcp/opencode" },
];

// Rendered in the accordion AND emitted as FAQPage JSON-LD from the same
// array, so the schema can never drift from the visible answers.
const faqItems = [
  {
    question: "What do I need to self-host Rybbit?",
    answer:
      "A server with Docker. Clone the repository and run the setup script with your domain — it brings up the full stack with Docker Compose. Self-hosting is free for personal and business use.",
  },
  {
    question: "Is the open-source version the full product?",
    answer:
      "Rybbit is 100% open source under AGPL v3, including the code for the cloud and enterprise offerings. See the self-hosting vs cloud guide for the practical differences between running it yourself and using the managed cloud.",
  },
  {
    question: "Does Rybbit have an SDK?",
    answer:
      "Yes — @rybbit/js on npm for websites and web apps, plus Node and React Native SDKs. The plain script tag works anywhere HTML does.",
  },
  {
    question: "Can I access my data programmatically?",
    answer:
      "Yes. The Stats API exposes the metrics the dashboard shows over HTTP with bearer-key auth, and there's an API playground in the dashboard for exploring endpoints and generating code snippets.",
  },
  {
    question: "How does the MCP server work?",
    answer:
      "It's a hosted MCP endpoint on top of the REST API. Point Claude Code, Claude Desktop, Codex, Cursor, VS Code, or opencode at it, and your agent can query traffic, debug errors, and manage goals with the same permissions as a teammate.",
  },
  {
    question: "Is Rybbit GDPR compliant without a cookie banner?",
    answer:
      "Yes. Rybbit doesn't use cookies or collect personal data that could identify visitors, so sites using it don't need a consent banner for analytics.",
  },
];

const tokenPlain = "";
const tokenName = "text-neutral-700 dark:text-neutral-300";
const tokenString = "text-emerald-700 dark:text-emerald-400";

const sdkTokens = [
  { text: "npm install @rybbit/js", className: tokenName },
  { text: "\n\n", className: tokenPlain },
  { text: "import", className: tokenName },
  { text: " rybbit ", className: tokenPlain },
  { text: "from", className: tokenName },
  { text: " ", className: tokenPlain },
  { text: '"@rybbit/js"', className: tokenString },
  { text: ";\n\n", className: tokenPlain },
  { text: "await", className: tokenName },
  { text: " rybbit.init({\n  analyticsHost: ", className: tokenPlain },
  { text: '"https://app.rybbit.io/api"', className: tokenString },
  { text: ",\n  siteId: ", className: tokenPlain },
  { text: '"YOUR_SITE_ID"', className: tokenString },
  { text: ",\n});", className: tokenPlain },
];

const apiTokens = [
  { text: "curl ", className: tokenName },
  {
    text: '"https://app.rybbit.io/api/sites/123/metric?parameter=country&start_date=2026-06-01&end_date=2026-06-30"',
    className: tokenString,
  },
  { text: " \\\n  -H ", className: tokenPlain },
  { text: '"Authorization: Bearer YOUR_API_KEY"', className: tokenString },
];

const apiResponseTokens = [
  { text: "{\n  ", className: tokenPlain },
  { text: '"data"', className: tokenName },
  { text: ": {\n    ", className: tokenPlain },
  { text: '"data"', className: tokenName },
  { text: ": [\n      { ", className: tokenPlain },
  { text: '"value"', className: tokenName },
  { text: ": ", className: tokenPlain },
  { text: '"US"', className: tokenString },
  { text: ", ", className: tokenPlain },
  { text: '"count"', className: tokenName },
  { text: ": 8420, ", className: tokenPlain },
  { text: '"percentage"', className: tokenName },
  { text: ": 54.63 },\n      { ", className: tokenPlain },
  { text: '"value"', className: tokenName },
  { text: ": ", className: tokenPlain },
  { text: '"GB"', className: tokenString },
  { text: ", ", className: tokenPlain },
  { text: '"count"', className: tokenName },
  { text: ": 2150, ", className: tokenPlain },
  { text: '"percentage"', className: tokenName },
  { text: ": 13.95 }\n    ],\n    ", className: tokenPlain },
  { text: '"totalCount"', className: tokenName },
  { text: ": 87\n  }\n}", className: tokenPlain },
];

const mcpTokens = [
  { text: "claude mcp add ", className: tokenName },
  { text: "--transport http rybbit \\\n  ", className: tokenPlain },
  { text: "https://app.rybbit.io/api/mcp", className: tokenString },
];

const selfHostTokens = [
  { text: "git clone ", className: tokenName },
  { text: "https://github.com/rybbit-io/rybbit.git", className: tokenString },
  { text: "\n", className: tokenPlain },
  { text: "cd ", className: tokenName },
  { text: "rybbit\n", className: tokenPlain },
  { text: "./setup.sh ", className: tokenName },
  { text: "your.domain.name", className: tokenString },
];

export default function ForDevelopersPage() {
  return (
    <div className="overflow-x-clip">
        <InteriorPageHero
          eyebrow="Rybbit for developers"
          title="Analytics that behaves like good software."
          description="One script tag, or one npm package. A REST API for everything the dashboard shows, an MCP server your agents can operate, and a codebase you can read, audit, and run on your own server."
          eventLocation="for_developers_hero"
          note="7-day free trial — or self-host free forever."
        />

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="dev-install-title">
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div className="lg:sticky lg:top-24">
                <SectionKicker>Install</SectionKicker>
                <h2
                  id="dev-install-title"
                  className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  One tag. Or one package.
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  Drop the script on any site, or install @rybbit/js and initialize it in two lines. Autocapture
                  starts immediately; custom events are there when you want them.
                </p>
                <Link
                  href="/docs/script"
                  className="group mt-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Script docs
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
            <div className="grid content-center gap-5 px-5 py-10 sm:px-8 md:grid-cols-2 md:py-14 lg:col-span-8 lg:px-10">
              <TrackingSnippet />
              <CodeCard label="app.ts" tokens={sdkTokens} />
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="dev-api-title">
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div className="lg:sticky lg:top-24">
                <SectionKicker>Stats API</SectionKicker>
                <h2
                  id="dev-api-title"
                  className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  Everything in the dashboard, over HTTP.
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  Every metric Rybbit shows is available from the REST API with a bearer key — pull traffic into your
                  own tools, build a live feed, or export events to a warehouse. An API playground in the dashboard
                  generates ready-to-use snippets.
                </p>
                <Link
                  href="/docs/api/getting-started"
                  className="group mt-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  API reference
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-5 px-5 py-10 sm:px-8 md:py-14 lg:col-span-8 lg:px-10">
              <CodeCard label="terminal" tokens={apiTokens} />
              <CodeCard label="response.json" tokens={apiResponseTokens} />
              <p className="max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                Organization keys or personal keys, rate-limited per plan. Sessions, metrics, funnels, goals, errors,
                and events are all endpoints — see the reference for the full surface.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="dev-mcp-title">
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div className="lg:sticky lg:top-24">
                <SectionKicker>MCP</SectionKicker>
                <h2
                  id="dev-mcp-title"
                  className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  Your agent already knows how to use it.
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  A hosted MCP server sits on top of the full REST API. Your agent reads live traffic, debugs errors,
                  and manages goals — with the same permissions as a teammate.
                </p>
                <Link
                  href="/docs/mcp"
                  className="group mt-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Set up MCP
                  <ArrowRight
                    className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-6 px-5 py-10 sm:px-8 md:py-14 lg:col-span-8 lg:px-10">
              <CodeCard label="terminal" tokens={mcpTokens} />
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Works with</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {mcpClients.map(client => (
                    <li key={client.name}>
                      <Link
                        href={client.path}
                        className="inline-flex rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors duration-200 hover:border-neutral-300 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-white"
                      >
                        {client.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="dev-oss-title">
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <GridCrosses />
            <div className="border-b border-neutral-200 px-5 py-14 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 md:py-20">
              <div className="lg:sticky lg:top-24">
                <SectionKicker>Open source</SectionKicker>
                <h2
                  id="dev-oss-title"
                  className="mt-5 max-w-sm text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl"
                >
                  Read the code. Run the code.
                </h2>
                <p className="mt-6 max-w-sm text-base leading-7 text-neutral-600 dark:text-neutral-400">
                  Every line of Rybbit is on GitHub under AGPL v3 — including the cloud and enterprise features. Clone
                  it, audit it, and run the full stack on your own VPS with Docker.
                </p>
                <div className="mt-8 flex flex-col items-start gap-4">
                  <GitHubStarButton />
                  <Link
                    href="/docs/self-hosting"
                    className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-emerald-700 transition-colors duration-200 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    Self-hosting guide
                    <ArrowRight
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-5 px-5 py-10 sm:px-8 md:py-14 lg:col-span-8 lg:px-10">
              <CodeCard label="terminal" tokens={selfHostTokens} />
              <p className="max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                The setup script brings up the full stack with Docker Compose. Self-hosting is free for personal and
                business use.
              </p>
            </div>
          </div>
        </section>

        <PersonaFaqSection heading="Developer questions, answered plainly." items={faqItems} />
        <PersonaCrossLinks current="for-developers" />

        <CTASection
          title="Ship analytics in the next ten minutes."
          description="One script tag now — the API, the MCP server, and self-hosting whenever you want them."
          eventLocation="for_developers_bottom_cta"
        />
      </div>
  );
}
