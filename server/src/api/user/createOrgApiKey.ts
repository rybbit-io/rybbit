import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { apiKeyLimitForPlan, createApiKeyWithinLimit } from "../../lib/apiKeyLimits.js";
import { auth } from "../../lib/auth.js";
import { ORG_API_KEY_CONFIG_ID } from "../../lib/bearerAuth.js";
import { API_RATE_LIMIT_WINDOW, IS_CLOUD, PRO_API_RATE_LIMIT, STANDARD_API_RATE_LIMIT } from "../../lib/const.js";
import { apiKeyPermissionsSchema } from "../../lib/scopes.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";

const createOrgApiKeyBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  expiresIn: z.number().int().positive().optional(),
  // Scope the key to specific resource:action pairs (see lib/scopes.ts).
  // Omit entirely for a full-access key.
  permissions: apiKeyPermissionsSchema.optional(),
});

/**
 * Creates an organization-owned API key: the key authenticates as the
 * organization itself (org-admin authority over its sites), so it survives
 * member departures. Plan gating, rate limits, and the key-count limit all
 * follow the owning org's subscription — unlike user keys, which follow the
 * creator's active org. The route guard requires org admin/owner; better-auth
 * re-checks via the organization access control's apiKey resource.
 */
export async function createOrgApiKey(
  request: FastifyRequest<{
    Params: { organizationId: string };
    Body: { name: string; expiresIn?: number; permissions?: Record<string, string[]> };
  }>,
  reply: FastifyReply
) {
  const { organizationId } = request.params;

  // Org keys must be minted by a person — better-auth validates that user's
  // org role, and the key records them as createdBy. The guard
  // (requireOrgAdminFromParams, deny-scoped) attaches request.user for every
  // credential it lets through: sessions and unrestricted user API keys. Org
  // keys carry no user and are rejected at the guard, so they can't mint keys.
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: "Organization API keys must be created by a signed-in user" });
  }

  const parsed = createOrgApiKeyBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid request body" });
  }
  const { name, expiresIn, permissions } = parsed.data;

  let planName: string | null = null;
  let rateLimitEnabled = false;
  let rateLimitMax: number | undefined;
  let rateLimitTimeWindow: number | undefined;

  if (IS_CLOUD) {
    const subscription = await getSubscriptionInner(organizationId);
    planName = subscription?.planName || "free";

    if (planName === "free" || planName.includes("basic")) {
      return reply.status(403).send({
        error: "API keys require a Standard or Pro plan. Please upgrade to create API keys.",
      });
    }

    rateLimitEnabled = true;
    rateLimitTimeWindow = API_RATE_LIMIT_WINDOW;
    rateLimitMax = planName.includes("pro") || planName === "custom" ? PRO_API_RATE_LIMIT : STANDARD_API_RATE_LIMIT;
  }

  const keyLimit = apiKeyLimitForPlan(planName);

  try {
    const outcome = await createApiKeyWithinLimit(organizationId, keyLimit, () =>
      auth.api.createApiKey({
        body: {
          name,
          expiresIn: expiresIn ?? undefined,
          configId: ORG_API_KEY_CONFIG_ID,
          organizationId,
          userId,
          metadata: { createdBy: userId },
          rateLimitEnabled,
          rateLimitTimeWindow,
          rateLimitMax,
          ...(permissions ? { permissions: permissions as Record<string, string[]> } : {}),
        },
      })
    );

    if (!outcome.allowed) {
      return reply.status(403).send({
        error: `This organization has reached its limit of ${keyLimit} API keys. Delete an unused key or upgrade your plan.`,
      });
    }

    return reply.send(outcome.result);
  } catch (error: unknown) {
    // Surface better-auth's own 4xx rejections (membership, permission,
    // validation) by message; anything else stays a generic 500 so internal
    // error detail never reaches the client.
    const err = error as { name?: string; statusCode?: unknown; message?: string };
    if (
      err?.name === "APIError" &&
      typeof err.statusCode === "number" &&
      err.statusCode >= 400 &&
      err.statusCode < 500
    ) {
      return reply.status(err.statusCode).send({ error: err.message || "Failed to create API key" });
    }
    request.log.error({ err: error }, "Error creating organization API key");
    return reply.status(500).send({ error: "Failed to create API key" });
  }
}
