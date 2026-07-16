import {
  BarChart3,
  Code,
  Database,
  Filter,
  LineChart,
  Link2,
  List,
  Megaphone,
  MousePointerClick,
  Rocket,
  Settings,
  ShoppingCart,
  Tag,
  TrendingUp,
  Zap,
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
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Track any interaction",
    description:
      "Button clicks, form submissions, signups, purchases, video plays, file downloads — track any user action with a single function call.",
  },
  {
    icon: <Tag className="w-5 h-5" />,
    title: "Custom properties",
    description:
      "Attach key-value properties to any event. Track purchase amounts, plan types, feature names, or any metadata that matters.",
  },
  {
    icon: <LineChart className="w-5 h-5" />,
    title: "Event trends over time",
    description:
      "Visualize how event volumes change over time. Compare event types, spot anomalies, and measure the impact of product changes.",
  },
  {
    icon: <List className="w-5 h-5" />,
    title: "Real-time event log",
    description:
      "Watch events arrive in real time with a live event stream. See every interaction as it happens with full property details.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Property breakdown",
    description:
      "Break down events by their custom properties. See which plan types are most popular, which buttons get the most clicks, or which features are used most.",
  },
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Outbound link tracking",
    description:
      "Automatically track clicks on external links. See which outbound links your visitors click without any extra code.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Autocapture",
    description:
      "Automatically capture clicks on buttons, links, and form submissions without writing any custom code. Retroactively analyze interactions.",
  },
  {
    icon: <Filter className="w-5 h-5" />,
    title: "Filter by event type",
    description:
      "Filter your analytics dashboard by specific events. See which pages, countries, or devices generate the most signups or purchases.",
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: "Full API access",
    description:
      "Query your event data programmatically via the API. Build custom dashboards, reports, or integrations on top of your event data.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Install the Rybbit script",
    description:
      "Add the Rybbit script to your site or install @rybbit/js from npm. Pageviews and basic interactions are tracked automatically.",
  },
  {
    step: 2,
    title: "Track custom events",
    description:
      "Call rybbit.event('event_name', { properties }) anywhere in your code. Track signups, purchases, feature usage, or any interaction.",
  },
  {
    step: 3,
    title: "View events in your dashboard",
    description:
      "Events appear instantly in your Events dashboard. See the live stream, trend charts, and property breakdowns.",
  },
  {
    step: 4,
    title: "Use events across features",
    description:
      "Your custom events power funnels, goals, and filters throughout Rybbit. One line of tracking code unlocks insights everywhere.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Product teams",
    description:
      "Track feature adoption, button clicks, and user interactions. Understand which features are actually used vs. which are ignored.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Growth teams",
    description:
      "Track conversion events, activation milestones, and engagement signals. Build a data-driven picture of your growth funnel.",
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: "E-commerce teams",
    description:
      "Track add-to-cart, wishlist, checkout, and purchase events with amount and product properties. Understand shopping behavior at every level.",
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Track CTA clicks, form submissions, and campaign-specific events. Tie marketing spend to actual user actions.",
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: "Developers",
    description:
      "Simple API — one function call to track anything. No tag managers, no complex configuration, no vendor lock-in.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Startup founders",
    description:
      "Track the events that matter most in your early days — signups, activations, and key feature usage — with minimal code.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "How do I track a custom event?",
    answer:
      "Call rybbit.event('event_name') or rybbit.event('event_name', { key: 'value' }) from anywhere in your JavaScript code. That's it — the event will appear in your dashboard immediately.",
  },
  {
    question: "What's the difference between pageviews and custom events?",
    answer:
      "Pageviews are tracked automatically whenever a user navigates to a new page. Custom events are user-defined actions — signups, purchases, button clicks, or any interaction you choose to track explicitly.",
  },
  {
    question: "Can I track events without writing code?",
    answer:
      "Yes. Rybbit's autocapture feature automatically tracks clicks on buttons, links, and form submissions. You can also use data-rybbit-event attributes in your HTML to track clicks without JavaScript.",
  },
  {
    question: "Are event properties searchable and filterable?",
    answer:
      "Yes. Custom properties you attach to events are fully searchable and can be used as filters across your dashboard. You can break down event data by any property value.",
  },
  {
    question: "Is there a limit on the number of event types?",
    answer:
      "There's no hard limit on event types. Your plan determines the total number of events per month, not the number of distinct event types.",
  },
  {
    question: "Can I use events in funnels and goals?",
    answer:
      "Yes. Custom events are first-class citizens in Rybbit. They can be used as funnel steps, goal triggers, and filter conditions throughout the platform.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Funnels",
    href: "/features/funnels",
    description: "Build conversion funnels from your custom events.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Set conversion goals triggered by specific events.",
  },
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description: "Watch sessions where specific events were triggered.",
  },
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The full dashboard with event data alongside page metrics.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description: "See all events fired by individual identified users.",
  },
  {
    title: "Error Tracking",
    href: "/features/error-tracking",
    description: "Automatically track JavaScript errors alongside your events.",
  },
];
