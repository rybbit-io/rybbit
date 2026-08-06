import {
  BarChart3,
  Bot,
  Code,
  Database,
  KeyRound,
  Megaphone,
  Monitor,
  Play,
  Rocket,
  Send,
  Settings,
  Smartphone,
} from "lucide-react";
import type {
  FAQItem,
  FeatureCapability,
  HowItWorksStep,
  RelatedFeature,
  WhoUsesItem,
} from "../components/FeaturePage";

export const capabilities: FeatureCapability[] = [
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Query every metric",
    description:
      "Overview KPIs, time series, breakdowns by any dimension, sessions, user profiles, events, goals, funnels, errors, Web Vitals, retention, journeys, even bot traffic. If the dashboard shows it, an endpoint returns it.",
  },
  {
    icon: <Send className="w-5 h-5" />,
    title: "Server-side event ingestion",
    description:
      "POST pageviews, custom events, errors, and performance data from your backend, mobile app, or anything that speaks HTTP. Rybbit resolves geolocation and parses user agents for you.",
  },
  {
    icon: <Play className="w-5 h-5" />,
    title: "Built-in API Playground",
    description:
      "Browse every endpoint in your dashboard, tweak parameters visually, see live responses with your own data, and copy ready-to-use code snippets.",
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: "Raw data access",
    description:
      "Pull raw events and sessions (newest first, filterable, paginated) to sync your analytics into a warehouse or join it with your product data.",
  },
  {
    icon: <KeyRound className="w-5 h-5" />,
    title: "Organization & personal keys",
    description:
      "Organization keys access every site in the org and survive team changes, which makes them the right choice for integrations. Personal keys have exactly your access. Both can be restricted to specific permissions and revoked anytime.",
  },
  {
    icon: <Settings className="w-5 h-5" />,
    title: "Full management surface",
    description:
      "Create sites, invite members, manage teams, define goals and funnels, and run data imports programmatically. You can automate provisioning end to end.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Create an API key",
    description:
      "Generate an organization key in Settings → Organization for integrations, or a personal key in Settings → Account for scripts. Optionally restrict either to specific permissions.",
  },
  {
    step: 2,
    title: "Prototype in the Playground",
    description:
      "Open API Playground from your site's sidebar. Pick an endpoint, set parameters with visual controls, and watch live responses come back with your real data.",
  },
  {
    step: 3,
    title: "Copy the code and call the API",
    description:
      "The Playground generates ready-to-use snippets. Authenticate with a Bearer token and use the same time ranges and filters the dashboard uses.",
  },
  {
    step: 4,
    title: "Ship it",
    description:
      "Scheduled reports, internal dashboards, warehouse syncs, user-facing stats in your own product: anything that can make an HTTP request can build on your analytics.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Code className="w-6 h-6" />,
    title: "Product engineers",
    description:
      "Surface analytics inside your own product: show creators their post views or customers their campaign stats, powered by live Rybbit data.",
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: "Data teams",
    description:
      "Sync raw events into your warehouse on a schedule and join web analytics with product and revenue data.",
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    title: "Agencies",
    description:
      "One organization key covers every client site. Generate weekly reports across your whole portfolio automatically.",
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Backend & mobile developers",
    description:
      "Track events where a script tag can't run: server-rendered flows, mobile apps, payment webhooks, CLI tools.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "SaaS platforms",
    description:
      "Provision a site per customer, manage access programmatically, and offer analytics as part of your own product.",
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing engineers",
    description:
      "Pipe channel performance and conversion data into Slack digests, spreadsheets, and the tools your team already reads.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "How is the API different from the MCP server?",
    answer:
      "Same data, different consumer. The REST API is for code: apps, pipelines, scheduled jobs, product features. The MCP server wraps the same access in tools an AI assistant can call. Build integrations on the API; connect Claude or Cursor through MCP.",
  },
  {
    question: "Can I send events through the API as well as read data?",
    answer:
      "Yes. The track endpoint accepts pageviews, custom events, outbound clicks, errors, and performance data from any platform. Sending with an API key marks the traffic as trusted server-side ingestion, bypassing bot detection and domain validation.",
  },
  {
    question: "Should I use an organization key or a personal key?",
    answer:
      "Organization keys are recommended for integrations: they cover every site in the organization and keep working when team members leave. Personal keys carry exactly your access, which suits personal scripts. Both support permission restrictions.",
  },
  {
    question: "What are the rate limits?",
    answer:
      "On Rybbit Cloud, Standard plans get 20 requests per minute and Pro plans get 200. Self-hosted instances have no rate limits. API keys aren't available on the free tier.",
  },
  {
    question: "Is the API stable?",
    answer:
      "The API is currently in beta, so breaking changes are possible as it expands. The API reference and in-app Playground always reflect the current behavior.",
  },
  {
    question: "Can I explore the API without writing code?",
    answer:
      "Yes. The API Playground in your dashboard lets you browse endpoints, adjust parameters with visual controls, and see live responses from your own site before you write a single line.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "MCP Server",
    href: "/features/mcp",
    description: "The same access, packaged for AI assistants instead of code.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Define the events you'll track and query through the API.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description: "Identify users and manage traits programmatically.",
  },
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "Every dashboard metric, available as an endpoint.",
  },
  {
    title: "Bot Detection",
    href: "/features/bot-detection",
    description: "API-key ingestion is trusted, so your server events are never filtered.",
  },
  {
    title: "Dashboard Sharing",
    href: "/features/dashboard-sharing",
    description: "No-code alternative: share or embed the dashboard itself.",
  },
];
