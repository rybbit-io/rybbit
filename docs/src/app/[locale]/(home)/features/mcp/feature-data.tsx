import {
  BarChart3,
  Bot,
  Database,
  KeyRound,
  Megaphone,
  Monitor,
  Plug,
  Rocket,
  Settings,
  ShieldCheck,
  Terminal,
  Users,
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
    icon: <Plug className="w-5 h-5" />,
    title: "Works with your AI tools",
    description:
      "Claude Code, Claude Desktop, Cursor, Codex, VS Code, opencode: any MCP client that speaks Streamable HTTP connects to the hosted endpoint in minutes.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "The full analytics surface",
    description:
      "Overview KPIs, time series, breakdowns by any dimension, live visitors, custom events, JavaScript errors, Web Vitals, retention cohorts, journeys, sessions, and raw events.",
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: "Read-only SQL",
    description:
      "Let your assistant write ClickHouse SQL against a site-scoped events table, with a schema tool, row limits, and execution-time caps. Ad-hoc questions without a BI tool.",
  },
  {
    icon: <Settings className="w-5 h-5" />,
    title: "Manage as well as read",
    description:
      "39 tools mirror the dashboard: create goals, save funnels, configure sites, identify users and update traits, and manage organization members and teams.",
  },
  {
    icon: <KeyRound className="w-5 h-5" />,
    title: "OAuth or scoped API keys",
    description:
      "Log in with OAuth in supporting clients, or create a revocable API key per integration, optionally scoped to exactly the permissions an agent needs, like analytics read-only.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Dashboard-grade permissions",
    description:
      "Every tool call re-runs the same access checks, roles, and rate limits as the dashboard's own API. Destructive tools are flagged so well-behaved clients confirm before running them.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Add the endpoint",
    description:
      "Point your MCP client at https://app.rybbit.io/api/mcp (or your own domain if you self-host). Per-client walkthroughs cover Claude Code, Cursor, Codex, Claude Desktop, VS Code, and opencode.",
  },
  {
    step: 2,
    title: "Authenticate",
    description:
      "OAuth-capable clients open a browser login and you approve access. Everywhere else, create an API key in your account settings, scoped if you want the agent limited to specific permissions.",
  },
  {
    step: 3,
    title: "Start with context",
    description:
      "The assistant calls list_sites to discover your organizations, sites, and its role in each: everything the other tools need.",
  },
  {
    step: 4,
    title: "Ask in plain language",
    description:
      "\"Summarize last month's traffic for the docs site and create a goal for signups.\" The assistant picks the right tools and works with live data, subject to your permissions.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Terminal className="w-6 h-6" />,
    title: "Developers & coding agents",
    description:
      "Check whether the error you just fixed still occurs in production, or look up which pages actually matter before a refactor, without leaving the editor.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Founders",
    description:
      "Ask Claude Desktop how the launch went instead of building a report. Conversational analytics with zero setup beyond a connector.",
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Compare campaigns, break down UTM performance, and draft reports by asking. No query builder, no CSV exports.",
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: "Data-curious teams",
    description:
      "The read-only SQL tool answers one-off questions that dashboards can't, without standing up a warehouse or BI tool.",
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    title: "Agencies",
    description:
      "Give a reporting agent a scoped read-only key per client and automate the weekly summary across every site you manage.",
  },
  {
    icon: <Bot className="w-6 h-6" />,
    title: "Automation builders",
    description:
      "Agents can create goals, save funnels, and manage sites, members, and teams. The write tools mirror what the dashboard can do.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "Which AI clients does it work with?",
    answer:
      "Any MCP client that supports Streamable HTTP. Rybbit has step-by-step guides for Claude Code, Claude Desktop, Cursor, Codex, VS Code, and opencode, and a generic configuration for everything else.",
  },
  {
    question: "Is my analytics data sent to an AI provider?",
    answer:
      "Not by Rybbit. The server contains no AI model and never sends your data to one. Data only leaves Rybbit in response to the MCP client you configure, so which model sees it is entirely determined by the client you connect.",
  },
  {
    question: "Can I make the connection read-only?",
    answer:
      "Yes. Create an API key scoped to read permissions (or request read scopes via OAuth) and the tool list shrinks to match. Any out-of-scope call is refused with a clear error naming the missing scope.",
  },
  {
    question: "Can an AI assistant delete my data?",
    answer:
      "Only with a credential that allows it. Destructive tools require org admin or owner roles, are excluded from scoped keys that don't grant them, and carry the MCP destructive annotation so well-behaved clients ask for confirmation first.",
  },
  {
    question: "How does the SQL tool stay safe?",
    answer:
      "It's read-only and restricted to a site-scoped events table, with row limits and execution-time caps. The assistant can query, never modify.",
  },
  {
    question: "Does it work on self-hosted Rybbit?",
    answer:
      "Yes. The MCP endpoint ships with self-hosted installations too: same tools, same permission model, under your own domain.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "Everything the dashboard shows, queryable by your assistant.",
  },
  {
    title: "Error Tracking",
    href: "/features/error-tracking",
    description: "Let your coding agent check production errors after a fix.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Create and analyze conversion goals from chat.",
  },
  {
    title: "Funnels",
    href: "/features/funnels",
    description: "Compute ad-hoc funnels or save them, all via a tool call.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description: "Identify users and manage traits programmatically.",
  },
  {
    title: "Analytics API",
    href: "/features/api",
    description: "The same access as plain REST, for code instead of assistants.",
  },
  {
    title: "Dashboard Sharing",
    href: "/features/dashboard-sharing",
    description: "Prefer humans over agents? Share the dashboard directly.",
  },
];
