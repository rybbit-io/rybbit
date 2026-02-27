import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { ComparisonSection } from "../components/ComparisonPage";

export const fathomComparisonData: ComparisonSection[] = [
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
        name: "Live visitor counter",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "UTM/Campaign tracking",
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
    title: "Privacy & Compliance",
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
        name: "No consent banner needed",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Daily rotating salt option",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "IP anonymization",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Data stored in EU",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Open Source & Transparency",
    features: [
      {
        name: "Open source",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Self-hostable",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Code transparency",
        rybbitValue: "Full",
        competitorValue: "None",
      },
      {
        name: "License",
        rybbitValue: "AGPL v3",
        competitorValue: "Proprietary",
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
        name: "Public dashboards",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Email reports",
        rybbitValue: false,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Technical & Performance",
    features: [
      {
        name: "Script size",
        rybbitValue: "18KB",
        competitorValue: "2KB",
      },
      {
        name: "Bot filtering",
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
        competitorValue: "PHP/Singlestore",
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
        competitorValue: "$15/mo",
      },
      {
        name: "Customer support",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
];
