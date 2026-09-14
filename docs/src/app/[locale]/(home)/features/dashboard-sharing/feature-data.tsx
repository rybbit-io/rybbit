import {
  Activity,
  Globe2,
  Heart,
  LayoutDashboard,
  Link2,
  Lock,
  Megaphone,
  Monitor,
  Rocket,
  Users,
  Video,
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
    icon: <Globe2 className="w-5 h-5" />,
    title: "Public dashboards",
    description:
      "One toggle makes a site's dashboard publicly viewable. Visitors get the full read-only dashboard, which suits building in public, open-source projects, and communities.",
  },
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Private links",
    description:
      "Generate a secret URL that gives read-only dashboard access to anyone who has it (clients, stakeholders, investors) without making anything public or creating accounts.",
  },
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    title: "Full dashboard embed",
    description:
      "Drop your entire analytics dashboard into any site with a single iframe. Light, dark, or system theme, optional sidebar, and the Rybbit footer hidden automatically.",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Live visitor widget",
    description:
      "A compact embed showing live visitors, a traffic chart, and top countries, as a dashboard card or an inline pill for your header or footer. Custom accent color, transparent background, no script tag.",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Read-only by design",
    description:
      "Viewers can never touch settings, goals, funnels, or reports. The widget goes further: its endpoint only exposes the numbers the widget displays, never sessions, pages, or referrers.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Teams & roles for internal sharing",
    description:
      "For your own people, skip links entirely: invite members to your organization, group them into teams, and restrict each member or team to specific sites.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Pick your audience",
    description:
      "The whole world? Enable Public Analytics. Specific people? Generate a private link. Your own website? Embed the full dashboard or the live visitor widget.",
  },
  {
    step: 2,
    title: "Configure it in Site Settings",
    description:
      "Each sharing option lives in its own tab in your site's settings. Toggle Public Analytics, generate a private link, or enable Widget Embeds and pick a variant, theme, time window, and accent color.",
  },
  {
    step: 3,
    title: "Copy the generated snippet",
    description:
      "For embeds, Rybbit generates the iframe snippet for you. Paste it into any site: no JavaScript, no tracking script dependency, and the widget is server-cached so it won't add load.",
  },
  {
    step: 4,
    title: "Viewers see live data, you keep control",
    description:
      "Everyone sees the same real-time analytics you do, read-only. Your other sites are unaffected, and you can turn any sharing option off at any time.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Build-in-public founders",
    description:
      "Share an open stats page and let anyone follow your growth.",
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    title: "Agencies",
    description:
      "Send each client a private link to their own live dashboard instead of monthly PDF exports. No client accounts to manage.",
  },
  {
    icon: <Video className="w-6 h-6" />,
    title: "Creators",
    description:
      "Embed the live visitor widget on your site as social proof, and share audience stats with sponsors via private link.",
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Open-source projects",
    description:
      "Public dashboards fit projects that value transparency. Show your community exactly how the docs and site are used.",
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Embed the dashboard on an internal wiki or share a private link with leadership, so everyone reads the same live numbers.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Multi-team companies",
    description:
      "Use organizations, teams, and per-site access to give every team exactly the dashboards they need, and nothing else.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "Do viewers need a Rybbit account?",
    answer:
      "No. Public dashboards, private links, and embeds all work without any account or login. Viewers just open the URL or the page with the embed.",
  },
  {
    question: "Can viewers change anything on a shared dashboard?",
    answer:
      "No. All sharing is strictly read-only. Viewers can explore the data but can never edit settings, reports, funnels, or goals, and sharing one site never affects your other sites.",
  },
  {
    question: "What's the difference between Public Analytics and the widget embed?",
    answer:
      "They're independent toggles. Public Analytics exposes the full read-only dashboard. The widget embed only exposes the data the widget itself displays: the live visitor count, a time series, and top five countries. Enabling the widget does not make your dashboard public.",
  },
  {
    question: "How secure are private links?",
    answer:
      "Private links are not listed anywhere, but anyone who has the URL can view the dashboard. Treat one like a shareable read-only secret, and share it only with people you'd show your analytics to.",
  },
  {
    question: "Will embedding the widget on a high-traffic page overload anything?",
    answer:
      "No. The widget HTML and its stats endpoint are cached server-side for 60 seconds, so even a very busy page adds negligible load. The visible count refreshes about once per minute.",
  },
  {
    question: "Can I match the embed to my site's design?",
    answer:
      "Yes. The dashboard embed supports light, dark, or system themes and an optional sidebar. The widget offers card and inline-pill variants, light and dark themes, a transparent background, and any hex accent color.",
  },
  {
    question: "Does this work on self-hosted Rybbit?",
    answer:
      "Yes. All sharing options work identically when self-hosting. The embed snippets simply use your own domain instead of app.rybbit.io.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The real-time dashboard you'll be sharing.",
  },
  {
    title: "Bot Detection",
    href: "/features/bot-detection",
    description: "Make sure the numbers you share are humans, not crawlers.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Shared dashboards include your conversion goals, read-only.",
  },
  {
    title: "Sessions",
    href: "/features/sessions",
    description: "Detailed visit data for you, summaries for your viewers.",
  },
  {
    title: "MCP Server",
    href: "/features/mcp",
    description: "Another way out of the dashboard: pipe analytics into AI assistants.",
  },
  {
    title: "White Label",
    href: "/white-label",
    description: "Agencies: run client dashboards under your own brand entirely.",
  },
];
