// Common utility functions and constants for subscription components

import { BASIC_SITE_LIMIT, BASIC_TEAM_LIMIT, FREE_SITE_LIMIT, STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "../../../lib/const";
import { getStripePrices, STRIPE_TIERS } from "../../../lib/stripe";

import { FeatureItem } from "@/components/pricing/PricingCard";

export const EVENT_TIERS = [...STRIPE_TIERS.map(tier => tier.events), "Custom"];

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

const stripePrices = getStripePrices();

// Find the appropriate price for a tier at current event limit
export function findPriceForTier(
  eventLimit: number | string,
  interval: "month" | "year",
  planType: "basic" | "standard" | "pro" = "standard"
) {
  // Check if we have a custom tier
  if (eventLimit === "Custom") {
    return null;
  }

  // Convert eventLimit to number to ensure type safety
  const eventLimitValue = Number(eventLimit);

  // Determine if we need to look for annual plans
  const isAnnual = interval === "year";

  // Filter plans by name pattern (with or without -annual suffix) and interval
  const plans = stripePrices.filter(
    plan =>
      (isAnnual
        ? plan.name.startsWith(planType) && plan.name.includes("-annual")
        : plan.name.startsWith(planType) && !plan.name.includes("-annual")) && plan.interval === interval
  );

  // Find a plan that matches or exceeds the event limit
  const matchingPlan = plans.find(plan => plan.events >= eventLimitValue);
  const selectedPlan = matchingPlan || plans[plans.length - 1] || null;

  // Return the matching plan or the highest tier available
  return selectedPlan;
}

// Format event tier for display
export function formatEventTier(tier: number | string): string {
  if (typeof tier === "string") {
    return tier;
  }

  return tier >= 1_000_000 ? `${tier / 1_000_000}M` : `${tier / 1_000}k`;
}
