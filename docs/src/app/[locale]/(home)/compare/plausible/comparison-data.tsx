import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { ComparisonSection } from "../components/ComparisonPage";

export const plausibleComparisonData: ComparisonSection[] = [
  {
    title: "Core Analytics Features",
    features: [
      {
        name: "Simple dashboard",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Real-time data",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Visitor analytics",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Page analytics",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Source tracking",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Device/OS/Browser stats",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "UTM tracking",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Custom events",
        rybbitValue: "With attributes",
        competitorValue: "Basic",
      },
      {
        name: "Conversion goals",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Advanced Features",
    features: [
      {
        name: "Session Replay",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Funnels",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "User journeys (Sankey)",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "User profiles",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Sessions tracking",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Real-time globe view",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Web Vitals dashboard",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Error tracking",
        rybbitValue: true,
        competitorValue: false,
      },
    ],
  },
  {
    title: "Privacy & Open Source",
    features: [
      {
        name: "Cookie-free tracking",
        rybbitValue: true,
        competitorValue: true,
      },
      // {
      //   name: "GDPR compliant",
      //   rybbitValue: true,
      //   competitorValue: true,
      // },
      {
        name: "No personal data collection",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Daily rotating salt option",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Open source",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Self-hostable",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "User Experience",
    features: [
      {
        name: "Beautiful UI",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "No training required",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Public dashboards",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Live demo",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Performance & Technical",
    features: [
      {
        name: "Real-time updates",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "API access",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Tech stack",
        rybbitValue: "Typescript/ClickHouse",
        competitorValue: "Elixir/ClickHouse",
      },
      {
        name: "Bot filtering",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Bypasses ad blockers",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Data & Infrastructure",
    features: [
      {
        name: "Data retention",
        rybbitValue: "2-5+ years",
        competitorValue: "Unlimited",
      },
      {
        name: "Data location",
        rybbitValue: "EU (Hetzner)",
        competitorValue: "EU (Hetzner)",
      },
      {
        name: "Team collaboration",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Organization support",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Multiple websites",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Pricing & Support",
    features: [
      {
        name: "Free tier",
        rybbitValue: DEFAULT_EVENT_LIMIT.toLocaleString() + " events",
        competitorValue: false,
      },
      {
        name: "Entry price",
        rybbitValue: "$19/mo",
        competitorValue: "$19/mo",
      },
      {
        name: "Pricing model",
        rybbitValue: "Events-based",
        competitorValue: "Pageview-based",
      },
      {
        name: "Customer support",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
];
