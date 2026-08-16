import { eq } from "drizzle-orm";
import NodeCache from "node-cache";
import { db } from "../db/postgres/postgres.js";
import { member } from "../db/postgres/schema.js";
import { consumeApiRateLimit, dailyLimitForPlan, type RateLimitDecision } from "./apiRateLimit.js";
import { IS_CLOUD, PRO_API_DAILY_LIMIT } from "./const.js";
import { createServiceLogger } from "./logger/logger.js";

const logger = createServiceLogger("api-rate-limit");

// Plans are resolved per request rather than stamped onto the key at creation,
// which is what makes an upgrade take effect on keys that already exist. The
// cache keeps that to one lookup per owner per minute; a plan change is visible
// within the TTL.
const PLAN_CACHE_TTL_SECONDS = 60;
const planCache = new NodeCache({ stdTTL: PLAN_CACHE_TTL_SECONDS, checkperiod: 120 });

// Last known good limit per owner, kept beyond the cache TTL. A lookup failure
// falls back to this rather than to a fixed guess, so a Stripe or database blip
// neither throttles a Pro customer nor promotes a Standard one.
const lastKnownLimit = new Map<string, number>();
const MAX_REMEMBERED_OWNERS = 50_000;

async function dailyLimitForOrganization(organizationId: string): Promise<number> {
  const { getSubscriptionInner } = await import("../api/stripe/getSubscription.js");
  const subscription = await getSubscriptionInner(organizationId);
  return dailyLimitForPlan(subscription?.planName);
}

/**
 * A user in several organizations gets the most generous of their plans: the
 * alternative would throttle a Pro customer because they also sit in someone
 * else's free org. Every membership is considered — sampling a subset would
 * make the answer depend on row order, so a Pro customer's quota could silently
 * depend on which organizations happened to come back first.
 */
async function dailyLimitForUser(userId: string): Promise<number> {
  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  if (memberships.length === 0) {
    return dailyLimitForPlan(null);
  }

  const limits = await Promise.all(memberships.map(row => dailyLimitForOrganization(row.organizationId)));
  return Math.max(...limits);
}

function rememberLimit(cacheKey: string, limit: number): void {
  if (lastKnownLimit.size >= MAX_REMEMBERED_OWNERS && !lastKnownLimit.has(cacheKey)) {
    // Map iteration is insertion-ordered, so this drops the oldest entry.
    const oldest = lastKnownLimit.keys().next();
    if (!oldest.done) {
      lastKnownLimit.delete(oldest.value);
    }
  }
  lastKnownLimit.set(cacheKey, limit);
}

/**
 * The daily quota that applies to a credential, cached per owner.
 *
 * A lookup failure reuses this owner's last known quota, and only falls back to
 * the Pro quota when there is none: a Stripe or database blip should not
 * throttle a paying customer, but it also should not hand every Standard owner
 * five times their budget. The burst tier — the one that actually protects the
 * database — does not depend on plan resolution either way.
 */
export async function resolveDailyLimit(identity: { userId?: string; organizationId?: string }): Promise<number> {
  if (!IS_CLOUD) {
    return 0;
  }
  const cacheKey = identity.organizationId ? `org:${identity.organizationId}` : `user:${identity.userId}`;
  const cached = planCache.get<number>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let limit: number;
  try {
    limit = identity.organizationId
      ? await dailyLimitForOrganization(identity.organizationId)
      : await dailyLimitForUser(identity.userId!);
    rememberLimit(cacheKey, limit);
  } catch (error) {
    limit = lastKnownLimit.get(cacheKey) ?? PRO_API_DAILY_LIMIT;
    logger.warn({ err: error, cacheKey, limit }, "Plan lookup failed for rate limit; using last known quota");
  }

  planCache.set(cacheKey, limit);
  return limit;
}

/** Drop a cached plan so a subscription change applies immediately. */
export function invalidateRateLimitPlanCache(ownerId: string): void {
  planCache.del([`org:${ownerId}`, `user:${ownerId}`]);
  lastKnownLimit.delete(`org:${ownerId}`);
  lastKnownLimit.delete(`user:${ownerId}`);
}

/**
 * Resolve the owner's quota and charge one request against it. Wired into the
 * bearer resolver, so it runs exactly once per credential verification — the
 * MCP proxy's handoff reuses that result rather than charging a second time.
 */
export async function consumeRateLimitForIdentity(identity: {
  userId?: string;
  organizationId?: string;
}): Promise<RateLimitDecision> {
  const ownerId = identity.organizationId ?? identity.userId!;
  const dailyLimit = await resolveDailyLimit(identity);
  return consumeApiRateLimit(ownerId, dailyLimit);
}
