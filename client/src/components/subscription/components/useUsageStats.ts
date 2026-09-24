import { DEFAULT_EVENT_LIMIT } from "../../../lib/subscription/constants";

interface SubscriptionData {
  monthlyEventCount?: number;
  eventLimit?: number;
}

export function useUsageStats(subscription: SubscriptionData | null | undefined) {
  const currentUsage = subscription?.monthlyEventCount || 0;
  const limit = subscription?.eventLimit || DEFAULT_EVENT_LIMIT;
  const percentageUsed = Math.min((currentUsage / limit) * 100, 100);
  const isNearLimit = percentageUsed > 80;
  const isLimitExceeded = currentUsage >= limit;

  return { currentUsage, limit, percentageUsed, isNearLimit, isLimitExceeded };
}
