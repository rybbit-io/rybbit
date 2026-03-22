import {
  BarChart3,
  Filter,
  Layers,
  Megaphone,
  MousePointerClick,
  PenTool,
  Rocket,
  Settings,
  ShoppingCart,
  Target,
  TrendingUp,
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
    icon: <Target className="w-5 h-5" />,
    title: "Path-based goals",
    description:
      "Track conversions when users visit specific URLs. Use pattern matching to capture variations like /signup, /thank-you, or /checkout/success.",
  },
  {
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Event-based goals",
    description:
      "Track conversions triggered by custom events — signups, purchases, downloads, or any interaction you define.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Completion count & rate",
    description:
      "See how many times each goal was completed and the conversion rate relative to your total visitors or sessions.",
  },
  {
    icon: <Filter className="w-5 h-5" />,
    title: "Event property conditions",
    description:
      "Define goals with specific event property conditions. For example, track only purchases where plan equals 'pro'.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Unlimited goals",
    description:
      "Create as many goals as you need. Track every conversion point in your product without worrying about limits.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Trend tracking",
    description:
      "See how your goal completion rates change over time. Compare periods to measure the impact of changes.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Define your goal",
    description:
      "Choose between a path-based goal (user visits a URL) or an event-based goal (user triggers a custom event). Give it a name and set any conditions.",
  },
  {
    step: 2,
    title: "Rybbit tracks completions",
    description:
      "Every matching pageview or event is counted as a goal completion. Data updates in real time with no sampling.",
  },
  {
    step: 3,
    title: "Monitor conversion rates",
    description:
      "See your goal completion count and rate on your goals dashboard. Filter by any dimension to understand which segments convert best.",
  },
  {
    step: 4,
    title: "Iterate and improve",
    description:
      "Use goal data alongside funnels and session replay to understand not just how many users convert, but why others don't.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Growth teams",
    description:
      "Track signup, activation, and upgrade goals. Measure the impact of product experiments on conversion rates.",
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Set goals for landing page conversions, demo requests, and lead captures. Tie campaign traffic to actual outcomes.",
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: "E-commerce teams",
    description:
      "Track add-to-cart, checkout completion, and purchase goals. Measure revenue-driving interactions across your store.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Startup founders",
    description:
      "Set clear conversion targets and track them without building custom analytics infrastructure. Focus on what moves the needle.",
  },
  {
    icon: <PenTool className="w-6 h-6" />,
    title: "Content teams",
    description:
      "Track newsletter signups, content downloads, and engagement goals to measure the ROI of your content strategy.",
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Product managers",
    description:
      "Define feature adoption goals and track how changes to your product affect user behavior and business outcomes.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "What's the difference between goals and funnels?",
    answer:
      "Goals track a single conversion point — 'did the user complete this action?' Funnels track a multi-step sequence — 'where did users drop off along the way?' Use goals for simple conversion tracking and funnels when you need to understand the journey to conversion.",
  },
  {
    question: "Can I set goals based on custom event properties?",
    answer:
      "Yes. When creating an event-based goal, you can add property conditions. For example, you can track only 'purchase' events where the 'plan' property equals 'enterprise'.",
  },
  {
    question: "Do goals track historical data?",
    answer:
      "Goals start tracking from the moment you create them. They will count conversions based on events that have already been collected, so if you have existing data, your goal metrics will populate immediately.",
  },
  {
    question: "Can I compare goal performance across time periods?",
    answer:
      "Yes. Use the date range selector and comparison feature to see how your goal completion rates change over time or compare against a previous period.",
  },
  {
    question: "Is there a limit on the number of goals?",
    answer:
      "No. You can create as many goals as you need to track all the conversion points that matter to your business.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Funnels",
    href: "/features/funnels",
    description: "Track multi-step conversion paths with drop-off analysis.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Define the events that power your goal tracking.",
  },
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The full dashboard with visitor and page metrics.",
  },
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description: "Watch sessions where users did or didn't complete goals.",
  },
  {
    title: "Retention",
    href: "/features/retention",
    description: "See how many converting users come back over time.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description: "View which identified users completed which goals.",
  },
];
