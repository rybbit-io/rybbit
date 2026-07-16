import {
  Eye,
  Filter,
  Layers,
  LayoutDashboard,
  Megaphone,
  PenTool,
  Rocket,
  Route,
  Search,
  Settings,
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
    icon: <Route className="w-5 h-5" />,
    title: "Interactive Sankey diagrams",
    description:
      "See user navigation paths as beautiful, interactive flow diagrams. Hover over any path to see the exact number of users who took it.",
  },
  {
    icon: <Settings className="w-5 h-5" />,
    title: "Adjustable depth",
    description:
      "Control how many navigation steps to visualize — from 2 to 6 steps deep. Zoom in on early navigation or follow the full journey.",
  },
  {
    icon: <Filter className="w-5 h-5" />,
    title: "Wildcard path filtering",
    description:
      "Use wildcards like /blog/* or /docs/** to group similar pages together and focus on the flows that matter most.",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Entry & exit pages",
    description:
      "See where users enter your site and where they leave. Identify your most effective landing pages and common exit points.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Volume visualization",
    description:
      "Flow thickness represents the number of users on each path. Instantly spot the most popular and least common navigation patterns.",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Filter by pattern",
    description:
      "Search for specific page patterns to focus on particular sections of your site. Great for analyzing product-specific flows.",
  },
];

export const howItWorks: HowItWorksStep[] = [
  {
    step: 1,
    title: "Pageviews are tracked automatically",
    description:
      "Rybbit tracks every pageview and navigation event out of the box. No extra setup needed — journey data is available immediately.",
  },
  {
    step: 2,
    title: "Open User Journeys",
    description:
      "Navigate to the User Journeys section in your dashboard. The Sankey diagram renders automatically from your pageview data.",
  },
  {
    step: 3,
    title: "Adjust depth and filters",
    description:
      "Set the number of steps to visualize (2–6), apply path filters with wildcards, and choose how many journeys to display (10–200).",
  },
  {
    step: 4,
    title: "Discover navigation patterns",
    description:
      "Hover over flows to see exact user counts. Identify the most common paths, unexpected detours, and pages that lose users.",
  },
];

export const whoUses: WhoUsesItem[] = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Product teams",
    description:
      "Understand how users actually navigate your product vs. how you designed them to. Validate information architecture decisions with real data.",
  },
  {
    icon: <PenTool className="w-6 h-6" />,
    title: "UX designers",
    description:
      "See if your navigation structure matches user expectations. Identify pages where users backtrack or take unexpected paths.",
  },
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing teams",
    description:
      "Map the path from landing page to conversion. See which content pages lead to signups and which create dead ends.",
  },
  {
    icon: <LayoutDashboard className="w-6 h-6" />,
    title: "Content strategists",
    description:
      "Discover how readers move between articles and sections. Optimize your internal linking based on real navigation data.",
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    title: "Startup founders",
    description:
      "See how your first users explore your product. Identify if they're finding your key features or getting lost along the way.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "E-commerce teams",
    description:
      "Track the browsing-to-purchase journey. See which product categories lead to checkout and where shoppers abandon.",
  },
];

export const faqItems: FAQItem[] = [
  {
    question: "Do I need to set up anything for user journeys?",
    answer:
      "No. User journeys are built from pageview data that Rybbit tracks automatically. As soon as you install the script and have traffic, journey data is available.",
  },
  {
    question: "What's the difference between user journeys and funnels?",
    answer:
      "Funnels track conversion through a specific, predefined sequence of steps. User journeys show you all the actual navigation paths users take, including ones you didn't anticipate. Use funnels when you know the path you want users to take; use journeys when you want to discover the paths they actually take.",
  },
  {
    question: "Can I filter journeys by traffic source or device?",
    answer:
      "Yes. All the standard filters in Rybbit — country, device, browser, referrer, UTM parameters — apply to user journey data. This lets you see how navigation patterns differ across segments.",
  },
  {
    question: "How many journey steps can I visualize?",
    answer:
      "You can visualize between 2 and 6 navigation steps. This lets you focus on initial navigation patterns or follow longer user flows through your site.",
  },
  {
    question: "What are wildcard path filters?",
    answer:
      "Wildcards let you group similar pages together. For example, /blog/* matches all blog posts, while /docs/** matches all documentation pages at any depth. This helps you see high-level navigation patterns without getting lost in individual URLs.",
  },
];

export const relatedFeatures: RelatedFeature[] = [
  {
    title: "Funnels",
    href: "/features/funnels",
    description:
      "Track predefined conversion paths with step-by-step drop-off data.",
  },
  {
    title: "Session Replay",
    href: "/features/session-replay",
    description:
      "Watch the actual sessions behind your journey data.",
  },
  {
    title: "Web Analytics",
    href: "/features/web-analytics",
    description: "The full dashboard with all your page and visitor metrics.",
  },
  {
    title: "Goals",
    href: "/features/goals",
    description: "Set conversion targets for the paths you discover.",
  },
  {
    title: "User Profiles",
    href: "/features/user-profiles",
    description: "See individual user journeys across their full history.",
  },
  {
    title: "Custom Events",
    href: "/features/custom-events",
    description: "Track specific interactions along the user journey.",
  },
];
