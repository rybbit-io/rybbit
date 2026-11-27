// AppSumo lifetime tier limits (monthly events, standard features)
export const APPSUMO_TIER_LIMITS = {
  "1": 20_000,
  "2": 100_000,
  "3": 250_000,
  "4": 500_000,
  "5": 1_000_000,
  "6": 2_000_000,
  "7": 3_000_000,
} as const;

/**
 * What an AppSumo license is worth each month toward a Pro subscription: the price of the
 * Standard plan covering the tier's events. Tier 1's 20k events sit under the smallest
 * Standard plan, so it gets the Basic 100k price; tier 7's 3M has no Standard plan of its
 * own, so it keeps tier 6's 2M price.
 */
export const APPSUMO_PRO_MONTHLY_CREDIT_USD: Record<string, number> = {
  "1": 14,
  "2": 19,
  "3": 29,
  "4": 49,
  "5": 69,
  "6": 99,
  "7": 99,
};

// Annual plans cost eight months of the monthly price, so the annual credit does too.
const ANNUAL_PRICE_MONTHS = 8;

/**
 * The credit (USD per billing interval) an AppSumo tier earns on a plan, or null when the
 * plan doesn't qualify. Only Pro plans that cover at least the tier's events qualify: a
 * live subscription replaces the license's limits, so a smaller plan would be a downgrade.
 */
export function appsumoProCredit(
  tier: string,
  plan: { isPro: boolean; interval: "month" | "year"; events: number }
): number | null {
  const monthly = APPSUMO_PRO_MONTHLY_CREDIT_USD[tier];
  const tierEvents = APPSUMO_TIER_LIMITS[tier as keyof typeof APPSUMO_TIER_LIMITS];
  if (!monthly || !tierEvents || !plan.isPro || plan.events < tierEvents) {
    return null;
  }
  return plan.interval === "year" ? monthly * ANNUAL_PRICE_MONTHS : monthly;
}
