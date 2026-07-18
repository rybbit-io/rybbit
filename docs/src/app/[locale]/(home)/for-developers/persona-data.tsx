import {
  Bot,
  Braces,
  FlaskConical,
  Gauge,
  Rocket,
  Scale,
  Server,
  Sparkles,
  Terminal,
} from "lucide-react";
import type {
  FAQItem,
  FeatureCapability,
  HowItWorksStep,
  RelatedFeature,
  WhoUsesItem,
} from "../features/components/FeaturePage";

export const capabilities: FeatureCapability[] = [
  {
    icon: <Terminal className="w-5 h-5" />,
    title: "Self-host with Docker Compose",
    description:
      "Run the full stack — dashboard, API, ClickHouse, Postgres — on your own server. You control retention, residency, and access, end to end.",
  },
  {
    icon: <Scale className="w-5 h-5" />,
    title: "100% open source, AGPL-3.0",
    description:
      "Every line of code is on GitHub, including the cloud and enterprise features. No open-core bait, no private forks of the good parts.",
  },
  {
    icon: <Braces className="w-5 h-5" />,
    title: "An API for everything",
    description:
      "Everything the dashboard shows is available over REST. Create scoped API keys — per user or per organization — and build whatever the dashboard doesn't.",
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: "An MCP server your agent can operate",
    description:
      "39 tools over Rybbit's API let Claude Code, Cursor, and other MCP clients read live traffic, debug errors, and manage goals — limited to the scopes you grant.",
  },
  {
    icon: <FlaskConical className="w-5 h-5" />,
    title: "Feature flags & experiments included",
    description:
      "Ship behind flags with audience targeting and remote config, and run experiments — without wiring up yet another vendor.",
  },
  {
    icon: <Gauge className="w-5 h-5" />,
    title: "A script you won't notice",
    description:
      "Lightweight, asynchronous, cookieless. It doesn't block rendering, doesn't hurt your Web Vitals, and doesn't add a consent banner to your site.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Add the snippet — or npm install",
    description:
      "Drop one script tag on any site, or install @rybbit/js. SDKs cover web, Node, and React Native, with guides for Next.js, WordPress, Shopify, and most everything else.",
  },
  {
    step: 2,
    title: "Pick where it runs",
    description:
      "docker compose up on your own VPS, or use the EU-hosted cloud and skip the ops. Same features, same dashboard, your call.",
  },
  {
    step: 3,
    title: "Track what actually matters",
    description:
      "Pageviews and sessions arrive automatically. Layer on custom events, identify users, and define goals and funnels when you're ready.",
  },
  {
    step: 4,
    title: "Automate the boring parts",
    description:
      "Mint a scoped API key, point your agent at the MCP server, and ask questions in your editor instead of tabbing to a dashboard.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Indie hackers",
    description:
      "Wire analytics into a side project in minutes, watch launch-day traffic live, and keep costs at zero while you find out if it has legs.",
  },
  {
    icon: <Server className="w-6 h-6" />,
    title: "Self-hosters",
    description:
      "Own your data on your own box. AGPL-licensed, Docker-deployed, and documented for real homelab and VPS setups.",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Agent builders",
    description:
      "Give your coding agent eyes on production traffic through MCP — errors, vitals, and conversions, queryable from the same session that ships the fix.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "Can I self-host Rybbit commercially?",
    answer:
      "Yes. Rybbit is licensed under AGPL-3.0 and you can self-host it for personal or business use. The entire codebase — including cloud features — is public on GitHub.",
  },
  {
    question: "What's different between self-hosted and cloud?",
    answer:
      "Feature parity is the goal and the differences are small. A few integrations need extra setup when self-hosting — for example, Google Search Console requires your own Google OAuth credentials. The self-hosting docs list the details.",
  },
  {
    question: "Will the tracking script slow my site down?",
    answer:
      "No. The script is lightweight and loads asynchronously, so it never blocks rendering. It sets no cookies and has no measurable impact on Core Web Vitals.",
  },
  {
    question: "Is there an API for everything I see in the dashboard?",
    answer:
      "Yes. The REST API covers the data and management surface the dashboard uses, authenticated with API keys you can scope to specific resources and actions — readonly analytics, goal management, whatever the job needs.",
  },
  {
    question: "How does the MCP server work?",
    answer:
      "Rybbit hosts an MCP server on top of its REST API with 39 tools. Connect Claude Code, Claude Desktop, Cursor, Codex, VS Code, or opencode with an API key; every tool call is authorized against that key's scopes and site access.",
  },
  {
    question: "Which SDKs and frameworks are supported?",
    answer:
      "@rybbit/js for the web, plus Node and React Native SDKs. The plain script tag works on any site, and the docs include guides for Next.js, React, Vue, WordPress, Shopify, Webflow, and more.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Track signups, purchases, and anything else with typed properties.",
  },
  {
    title: "Error Tracking",
    href: "/features/error-tracking",
    description: "See client-side errors with the sessions that triggered them.",
  },
  {
    title: "Web Vitals",
    href: "/features/web-vitals",
    description: "LCP, CLS, INP and friends, measured on real traffic.",
  },
  {
    title: "Self-hosting guide",
    href: "/docs/self-hosting",
    description: "Docker Compose setup, hardware sizing, and upgrade paths.",
  },
  {
    title: "API reference",
    href: "/docs/api/getting-started",
    description: "Endpoints, authentication, and scoped API keys.",
  },
  {
    title: "MCP setup",
    href: "/docs/mcp",
    description: "Connect your agent to Rybbit in a couple of minutes.",
  },
];
