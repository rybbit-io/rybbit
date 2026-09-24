import { FastifyReply, FastifyRequest } from "fastify";
import { dailyQuotaResetSeconds, peekDailyUsage } from "../../lib/apiRateLimit.js";
import { resolveDailyLimit } from "../../lib/apiRateLimitPolicy.js";
import { API_BURST_LIMIT, API_BURST_WINDOW_MS, IS_CLOUD } from "../../lib/const.js";

export interface OrgApiUsageResponse {
  /** False on self-hosted, where API requests are not metered. */
  metered: boolean;
  /**
   * False when the counter could not be read (Redis unavailable). The quota is
   * still being enforced; only this reading is missing, and callers should say
   * so rather than render a zero.
   */
  available: boolean;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  /** Seconds until the quota resets at 00:00 UTC. */
  resetsInSeconds: number;
  burstLimit: number;
  burstWindowSeconds: number;
}

/**
 * Today's API request usage for an organization's own API keys.
 *
 * Covers organization-owned keys only. Personal keys are budgeted per user
 * (that is the bucket they are charged against), so their usage is not part of
 * this number.
 */
export async function getOrgApiUsage(
  request: FastifyRequest<{ Params: { organizationId: string } }>,
  reply: FastifyReply
) {
  const { organizationId } = request.params;

  if (!IS_CLOUD) {
    return reply.send({
      metered: false,
      available: true,
      dailyUsed: 0,
      dailyLimit: 0,
      dailyRemaining: 0,
      resetsInSeconds: dailyQuotaResetSeconds(),
      burstLimit: API_BURST_LIMIT,
      burstWindowSeconds: API_BURST_WINDOW_MS / 1000,
    } satisfies OrgApiUsageResponse);
  }

  try {
    const [dailyLimit, dailyUsed] = await Promise.all([
      resolveDailyLimit({ organizationId }),
      peekDailyUsage(organizationId),
    ]);

    return reply.send({
      metered: true,
      available: dailyUsed !== null,
      dailyUsed: dailyUsed ?? 0,
      dailyLimit,
      dailyRemaining: Math.max(dailyLimit - (dailyUsed ?? 0), 0),
      resetsInSeconds: dailyQuotaResetSeconds(),
      burstLimit: API_BURST_LIMIT,
      burstWindowSeconds: API_BURST_WINDOW_MS / 1000,
    } satisfies OrgApiUsageResponse);
  } catch (error) {
    request.log.error({ err: error, organizationId }, "Failed to read API usage");
    return reply.status(500).send({ error: "Failed to fetch API usage" });
  }
}
