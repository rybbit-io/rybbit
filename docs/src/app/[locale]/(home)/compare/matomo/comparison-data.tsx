import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { ComparisonSection } from "../components/ComparisonPage";

export const matomoComparisonData: ComparisonSection[] = [
  {
    title: "Ease of Use",
    features: [
      {
        name: "Simple, intuitive interface",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Single-page dashboard",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "No training required",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "One-click setup",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Beautiful modern UI",
        rybbitValue: true,
        competitorValue: false,
      },
    ],
  },
  {
    title: "Core Analytics Features",
    features: [
      {
        name: "Web analytics dashboard",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Real-time data",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Custom events tracking",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Conversion goals",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Ecommerce tracking",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Heatmaps",
        rybbitValue: false,
        competitorValue: true,
      },
      {
        name: "A/B testing",
        rybbitValue: false,
        competitorValue: true,
      },
      {
        name: "Form analytics",
        rybbitValue: false,
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
        competitorValue: true,
      },
      {
        name: "Funnels",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "User journeys (Sankey)",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "User profiles",
        rybbitValue: true,
        competitorValue: true,
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
      {
        name: "Public dashboards",
        rybbitValue: true,
        competitorValue: false,
      },
    ],
  },
  {
    title: "Performance & Infrastructure",
    features: [
      {
        name: "Script size",
        rybbitValue: "18KB",
        competitorValue: "20-50KB",
      },
      {
        name: "Global CDN included",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Modern tech stack",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Auto-scaling cloud",
        rybbitValue: true,
        competitorValue: "Self-host only",
      },
      {
        name: "Zero maintenance",
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
        competitorValue: "Optional",
      },
      // {
      //   name: "GDPR compliant by default",
      //   rybbitValue: true,
      //   competitorValue: false,
      // },
      {
        name: "No consent banner needed",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Daily rotating salt option",
        rybbitValue: true,
        competitorValue: false,
      },
      {
        name: "Data stored in EU",
        rybbitValue: true,
        competitorValue: "Varies",
      },
    ],
  },
  {
    title: "Data & Hosting",
    features: [
      {
        name: "Data retention",
        rybbitValue: "2-5+ years",
        competitorValue: "24 months (cloud)",
      },
      {
        name: "Self-hostable",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Managed cloud option",
        rybbitValue: true,
        competitorValue: "Limited",
      },
      {
        name: "Easy Google Analytics import",
        rybbitValue: false,
        competitorValue: "Complex",
      },
      {
        name: "Data export",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "API access",
        rybbitValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Support & Pricing",
    features: [
      {
        name: "Human customer support",
        rybbitValue: true,
        competitorValue: "Paid only",
      },
      {
        name: "Free tier",
        rybbitValue: DEFAULT_EVENT_LIMIT.toLocaleString() + " events",
        competitorValue: "Self-host only",
      },
      {
        name: "Cloud pricing",
        rybbitValue: "$19-$499/mo",
        competitorValue: "€19-€450+/mo",
      },
      {
        name: "Open source",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Live demo available",
        rybbitValue: true,
        competitorValue: true,
      },
      {
        name: "Documentation quality",
        rybbitValue: "Modern",
        competitorValue: "Extensive but complex",
      },
    ],
  },
];
