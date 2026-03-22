import {
  BarChart3,
  Calendar,
  Grid3X3,
  Megaphone,
  Palette,
  Rocket,
  Settings,
  Target,
  Timer,
  TrendingUp,
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
    icon: <Grid3X3 className="w-5 h-5" />,
    title: "Cohort analysis tables",
    description:
      "Color-coded retention tables show you exactly what percentage of each cohort returns on day 1, day 7, day 30, and beyond.",
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: "Daily or weekly cohorts",
    description:
      "Choose between daily and weekly cohort groupings depending on your product's engagement frequency.",
  },
  {
    icon: <Timer className="w-5 h-5" />,
    title: "Flexible time ranges",
    description:
      "Analyze retention over 7 days, 30 days, 90 days, or up to a full year. Match the window to your product's natural cycle.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Cohort size display",
    description:
      "See how many users are in each cohort alongside their retention percentages for proper context on small vs. large cohorts.",
  },
  {
    icon: <Palette className="w-5 h-5" />,
    title: "Color-coded heatmap",
    description:
      "High retention periods are highlighted in green; low retention in lighter shades. Spot trends instantly without reading every number.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Trend comparison",
    description:
      "Compare retention rates across different time periods to measure whether product changes are improving user stickiness.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Users visit your site",
    description:
      "Rybbit automatically tracks visitor sessions. Each visitor is assigned to a cohort based on the date of their first visit.",
  },
  {
    step: 2,
    title: "Return visits are tracked",
    description:
      "When a visitor returns on subsequent days or weeks, Rybbit records the return visit and maps it to their original cohort.",
  },
  {
    step: 3,
    title: "Open the Retention dashboard",
    description:
      "Navigate to Retention in your dashboard. Select daily or weekly granularity and your desired time range.",
  },
  {
    step: 4,
    title: "Analyze your cohorts",
    description:
      "Read the retention table to understand how each cohort retains over time. Identify if recent changes improved or hurt retention rates.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Product teams",
    description:
      "Measure whether product changes improve user stickiness. Track if new features bring users back more frequently.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Startup founders",
    description:
      "Retention is the most important metric for product-market fit. See if your early users are coming back or churning.",
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Compare retention rates across acquisition channels. See which traffic sources bring users who actually stick around.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Growth teams",
    description:
      "Identify retention plateaus and inflection points. Focus optimization efforts on the time period with the steepest drop-off.",
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Product managers",
    description:
      "Use retention data to justify roadmap decisions. Show stakeholders how specific features impact long-term engagement.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Data-driven teams",
    description:
      "Combine retention data with event tracking and funnels to build a complete picture of user engagement over time.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "How are cohorts defined?",
    answer:
      "A cohort is a group of users who first visited your site during the same time period. With daily granularity, all users who first visited on March 1st form one cohort. With weekly granularity, all first-time visitors in a given week form a cohort.",
  },
  {
    question: "What counts as a 'return visit'?",
    answer:
      "A return visit is any session by a previously seen visitor on a subsequent day or week. Rybbit uses privacy-friendly identifiers (daily rotating salts) to recognize returning visitors without cookies or personal data.",
  },
  {
    question: "Can I see retention for specific user segments?",
    answer:
      "Yes. Apply any filter — country, device, referrer, UTM source — to see retention data for specific segments. This helps you understand which audiences have the best long-term engagement.",
  },
  {
    question: "What time ranges are available?",
    answer:
      "You can analyze retention over periods from 7 days up to 365 days. Choose the range that matches your product's natural engagement cycle.",
  },
  {
    question: "How does this work with privacy and cookie-free tracking?",
    answer:
      "Rybbit uses daily rotating salt-based identifiers to recognize returning visitors without cookies or personal data. This means retention data is accurate while remaining fully GDPR compliant.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The full dashboard with traffic and engagement metrics.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Track conversions and see how they correlate with retention.",
  },
  {
    title: "Funnels",
    href: "/features/funnels",
    description: "Understand the journey that leads to retained users.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description: "See individual user histories and engagement patterns.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Track engagement events that indicate user stickiness.",
  },
  {
    title: "User Journeys",
    href: "/features/user-journeys",
    description: "Map how retained users navigate differently from churned ones.",
  },
];
