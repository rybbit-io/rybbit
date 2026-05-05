// Common utility functions and constants for subscription components

import { BASIC_SITE_LIMIT, BASIC_TEAM_LIMIT, FREE_SITE_LIMIT, STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "../../../lib/const";

import { FeatureItem } from "@/components/pricing/PricingCard";

// Re-export shared utils from canonical location
export { EVENT_TIERS, findPriceForTier, formatEventTier } from "../../../lib/subscription/planUtils";

export const BASIC_FEATURES = [
  `${BASIC_SITE_LIMIT} website`,
  `${BASIC_TEAM_LIMIT} team member`,
  "Web analytics dashboard",
  "Goals",
  "Custom events",
  "2 year data retention",
  "Email support",
];

export const STANDARD_FEATURES = [
  "Everything in Basic",
  `Up to ${STANDARD_SITE_LIMIT} websites`,
  `Up to ${STANDARD_TEAM_LIMIT} team members`,
  "Custom events",
  "Funnels",
  "Journeys",
  "Web vitals",
  "Error tracking",
  "User profiles",
  "Retention",
  "Sessions",
  "3D globe view"
];

export const PRO_FEATURES = [
  "Everything in Standard",
  "Unlimited websites",
  "Unlimited team members",
  "Session replays",
  "5 year data retention",
  "10x higher API rate limit",
  "Priority support",
];

export const ENTERPRISE_FEATURES = [
  "Everything in Pro",
  "Single Sign-On (SSO)",
  "Infinite data retention",
  "Dedicated isolated instance",
  "On-premise Installation",
  "Custom Features",
  "Whitelabeling",
  "Manual invoicing",
  "Uptime SLA",
  "Enterprise support",
  "Slack/live chat support",
];

export const FREE_FEATURES: FeatureItem[] = [
  { feature: "1 user", included: true },
  { feature: `${FREE_SITE_LIMIT} website`, included: true },
  { feature: "Web analytics dashboard", included: true },
  { feature: "Custom events", included: true },
  { feature: "6 month data retention", included: true },
  { feature: "Advanced features", included: false },
  { feature: "Email support", included: false },
];
