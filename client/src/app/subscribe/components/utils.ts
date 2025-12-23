// Common utility functions and constants for subscription components

import { FREE_SITE_LIMIT, STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "../../../lib/const";
import { getStripePrices, STRIPE_TIERS } from "../../../lib/stripe";

export const EVENT_TIERS = [...STRIPE_TIERS.map(tier => tier.events), "Custom"];

export const STANDARD_FEATURES = [
  "Everything in Free",
  `Up to ${STANDARD_SITE_LIMIT} websites`,
  `Up to ${STANDARD_TEAM_LIMIT} team members`,
  "Funnels",
  "Goals",
  "Journeys",
  "Web vitals",
  "Error tracking",
  "User profiles",
  "Retention",
  "Sessions",
  "Email reports",
  "2 year data retention",
  "Email support",
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

export const FREE_FEATURES = [
  "1 user",
  `${FREE_SITE_LIMIT} website`,
  "Web analytics dashboard",
  "Custom events",
  "6 month data retention",
];

const stripePrices = getStripePrices();

// Find the appropriate price for a tier at current event limit
export function findPriceForTier(
  eventLimit: number | string,
  interval: "month" | "year",
  planType: "standard" | "pro" = "standard"
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
