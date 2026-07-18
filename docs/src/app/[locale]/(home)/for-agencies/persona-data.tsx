import {
  Building2,
  Import,
  LayoutDashboard,
  Link2,
  Mail,
  Megaphone,
  PenTool,
  Search,
  Users,
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
    icon: <Building2 className="w-5 h-5" />,
    title: "Every client in one workspace",
    description:
      "Add all your client sites to a single organization and switch between dashboards in one click. No juggling logins, no per-client accounts, no browser profiles.",
  },
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Client dashboards without client logins",
    description:
      "Generate a private link and your client sees their live, read-only dashboard — no account, no password, no training call. Prefer full transparency? Make the dashboard public.",
  },
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    title: "Embed reports where clients already look",
    description:
      "Drop the full dashboard into your client portal with an iframe embed, or add the compact live-visitor widget to any page you ship.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Scope access per client",
    description:
      "Group sites into teams — one per client — and assign members to them. A contractor on one account never sees another client's numbers.",
  },
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Weekly reports on autopilot",
    description:
      "Automatic weekly email summaries keep clients in the loop between check-ins, without you exporting a single chart.",
  },
  {
    icon: <Import className="w-5 h-5" />,
    title: "Bring client history with you",
    description:
      "Import historical data from Plausible, Umami, or Simple Analytics, so a client's dashboard starts with their full story instead of an empty chart.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Create your organization and add client sites",
    description:
      "Each site takes one script tag and a couple of minutes. Everything lives under one login — yours.",
  },
  {
    step: 2,
    title: "Import each site's history",
    description:
      "Moving a client off Plausible, Umami, or Simple Analytics? Upload their export and their past traffic appears alongside the new data.",
  },
  {
    step: 3,
    title: "Organize sites into client teams",
    description:
      "Invite your team members and assign them to the clients they work on. Roles control who can view and who can manage.",
  },
  {
    step: 4,
    title: "Hand every client a live dashboard",
    description:
      "Share a private read-only link, embed the dashboard in your portal, and turn on weekly email reports. Clients stay informed without ever filing a 'can you send me the numbers' ticket.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <PenTool className="w-6 h-6" />,
    title: "Web studios & freelancers",
    description:
      "Deliver every site with analytics already wired in. The dashboard link goes in your handoff email, and you keep visibility for the next redesign pitch.",
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing agencies",
    description:
      "Prove campaign outcomes with channels, UTM breakdowns, goals, and funnels — across the whole client portfolio, from one screen.",
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: "SEO & content consultants",
    description:
      "Pair Google Search Console data with real, unsampled traffic to show clients exactly which content earns its keep.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "Do my clients need a Rybbit account to see their dashboard?",
    answer:
      "No. Share a private link and they get a live, read-only dashboard in their browser — no account, no login. You can also make a site's analytics fully public, or embed the dashboard in your own client portal.",
  },
  {
    question: "Can I keep clients and contractors from seeing each other's sites?",
    answer:
      "Yes. Teams let you group sites by client and assign specific members to each team. Someone assigned to one client's team only sees that client's sites.",
  },
  {
    question: "Can I import a client's existing analytics data?",
    answer:
      "Yes — Rybbit imports historical data from Plausible, Umami, and Simple Analytics today, with more platforms planned. Your client keeps their history when they switch.",
  },
  {
    question: "Will client sites still need a cookie consent banner?",
    answer:
      "Not for analytics. Rybbit is cookieless and doesn't collect personal data, so it doesn't trigger consent requirements under GDPR or CCPA. (If a site runs other cookie-based tools, those still need consent.)",
  },
  {
    question: "How many sites and team members can I add?",
    answer:
      "Standard plans include up to 5 websites and 3 team members. Pro plans have unlimited websites and unlimited team members — one subscription covers your whole client roster.",
  },
  {
    question: "Can I white-label the dashboard?",
    answer:
      "There's no branded white-label mode yet. Many agencies embed the dashboard inside their own portal instead, and because Rybbit is open source under AGPL-3.0, you can self-host and adapt it to your needs.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The realtime dashboard every client link points to.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Define the conversions each client cares about and track them per site.",
  },
  {
    title: "Funnels",
    href: "/features/funnels",
    description: "Show clients where visitors drop off, not just how many arrived.",
  },
  {
    title: "Teams",
    href: "/docs/teams",
    description: "How to group sites by client and control member access.",
  },
  {
    title: "Dashboard embeds",
    href: "/docs/embeds/dashboard",
    description: "Put the full read-only dashboard inside your client portal.",
  },
  {
    title: "Data import",
    href: "/docs/data-import",
    description: "Migrate client history from Plausible, Umami, or Simple Analytics.",
  },
];
