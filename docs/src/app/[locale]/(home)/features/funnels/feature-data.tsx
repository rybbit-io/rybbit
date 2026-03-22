import {
  BarChart3,
  Filter,
  Funnel,
  LineChart,
  MousePointerClick,
  PenTool,
  Rocket,
  Search,
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
    icon: <Funnel className="w-5 h-5" />,
    title: "Multi-step funnels",
    description:
      "Define funnels with any number of steps using page paths or custom events. See exactly where users drop off at each stage.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Conversion rates at every step",
    description:
      "Get precise conversion and drop-off percentages between each step. No sampling — every single event is counted.",
  },
  {
    icon: <Filter className="w-5 h-5" />,
    title: "Segment by any property",
    description:
      "Break down funnel performance by country, device, referrer, or custom event properties to find which segments convert best.",
  },
  {
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Path or event-based steps",
    description:
      "Build funnels using page URLs, custom events, or a mix of both. Flexible enough for any conversion flow.",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Search & manage funnels",
    description:
      "Create, edit, and organize your funnels. Search by name to quickly find the one you need across dozens of funnels.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Real-time conversion data",
    description:
      "Funnel data updates in real time. Launch a campaign and immediately see how it affects your conversion rates.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Track your events",
    description:
      "Rybbit automatically tracks pageviews. For custom events like signups or purchases, add a single line of code with rybbit.event().",
  },
  {
    step: 2,
    title: "Create a funnel",
    description:
      "Select the events or page paths that define your conversion flow. Name your funnel and arrange the steps in order.",
  },
  {
    step: 3,
    title: "See where users drop off",
    description:
      "Instantly view conversion rates and drop-off percentages at each step. Identify the biggest leaks in your funnel.",
  },
  {
    step: 4,
    title: "Optimize and iterate",
    description:
      "Make changes to your product or marketing, then check back to see if your conversion rates improve. Compare date ranges to measure impact.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Product & growth teams",
    description:
      "Understand which onboarding steps lose users, optimize activation flows, and measure the impact of product changes on conversion.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Track campaign-to-conversion funnels. See which traffic sources produce the highest-converting users, not just the most clicks.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Founders & operators",
    description:
      "Get a clear picture of your core conversion metrics without hiring a data team. Simple setup, instant insights.",
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: "E-commerce teams",
    description:
      "Track add-to-cart → checkout → purchase funnels. Identify exactly which step is costing you the most revenue.",
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "SaaS companies",
    description:
      "Measure signup → onboarding → activation → retention funnels. Understand your product-led growth metrics clearly.",
  },
  {
    icon: <PenTool className="w-6 h-6" />,
    title: "UX designers",
    description:
      "Validate design changes with hard data. See if your new checkout flow actually improves completion rates.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "Do I need to set up funnels separately from events?",
    answer:
      "No. Funnels are built on top of the events you're already tracking. If you're tracking pageviews (automatic) or custom events, you can create funnels from them immediately — no additional instrumentation needed.",
  },
  {
    question: "Can I filter funnels by user property or segment?",
    answer:
      "Yes. You can apply any filter — country, device, browser, referrer, UTM parameters, or custom event properties — to see how different segments perform through your funnel.",
  },
  {
    question: "How is funnel data calculated?",
    answer:
      "Funnel data is calculated from raw events with no sampling. A user counts as completing a step if they triggered that event or visited that page within the selected date range. Drop-off shows the percentage that didn't proceed to the next step.",
  },
  {
    question: "Can I use page paths and custom events in the same funnel?",
    answer:
      "Yes. Each funnel step can be either a page path or a custom event. You can mix and match freely — for example, landing page visit → signup event → onboarding page → activation event.",
  },
  {
    question: "How many funnels can I create?",
    answer:
      "There's no limit on the number of funnels you can create. Create as many as you need to track different conversion flows across your site or product.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Track the interactions that power your funnel steps.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Set conversion targets and track them automatically.",
  },
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description:
      "Watch sessions where users dropped off to understand why.",
  },
  {
    title: "User Journeys",
    href: "/features/user-journeys",
    description: "See the full navigation paths users take through your site.",
  },
  {
    title: "Retention",
    href: "/features/retention",
    description: "Measure how many users come back after converting.",
  },
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The full analytics dashboard behind your funnel data.",
  },
];
