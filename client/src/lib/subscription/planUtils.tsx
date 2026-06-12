import { getStripePrices, STRIPE_TIERS } from "../stripe";

// Helper function to format dates
export const formatDate = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "N/A";
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export const EVENT_TIERS = [...STRIPE_TIERS.map(tier => tier.events), "Custom"];

const stripePrices = getStripePrices();

// Find the appropriate price for a tier at current event limit
export function findPriceForTier(
  eventLimit: number | string,
  interval: "month" | "year",
  planType: "basic" | "standard" | "pro" = "standard"
) {
  if (eventLimit === "Custom") {
    return null;
  }

  const eventLimitValue = Number(eventLimit);
  const isAnnual = interval === "year";

  const plans = stripePrices.filter(
    plan =>
      (isAnnual
        ? plan.name.startsWith(planType) && plan.name.includes("-annual")
        : plan.name.startsWith(planType) && !plan.name.includes("-annual")) && plan.interval === interval
  );

  const matchingPlan = plans.find(plan => plan.events >= eventLimitValue);
  const selectedPlan = matchingPlan || plans[plans.length - 1] || null;

  return selectedPlan;
}

// Whether a plan includes session replay: Pro plans (excluding large trials),
// AppSumo tiers 4-6, and custom (enterprise) plans. Mirrors the server-side
// subscriptionIncludesReplay rule.
export function planIncludesReplay(
  subscription: { planName: string; isTrial?: boolean; eventLimit?: number } | null | undefined
): boolean {
  if (!subscription) return false;
  if (subscription.planName === "custom") return true;
  if (/^appsumo-[456]$/.test(subscription.planName)) return true;
  const isLargeTrial = !!subscription.isTrial && (subscription.eventLimit ?? 0) >= 500_000;
  return subscription.planName.includes("pro") && !isLargeTrial;
}

// Format event tier for display
export function formatEventTier(tier: number | string): string {
  if (typeof tier === "string") {
    return tier;
  }

  return tier >= 1_000_000 ? `${tier / 1_000_000}M` : `${tier / 1_000}k`;
}
