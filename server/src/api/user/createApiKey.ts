import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { apiKeyLimitForPlan, createApiKeyWithinLimit } from "../../lib/apiKeyLimits.js";
import { auth } from "../../lib/auth.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { apiKeyPermissionsSchema } from "../../lib/scopes.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";
import { IS_CLOUD } from "../../lib/const.js";

const createApiKeyBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  expiresIn: z.number().int().positive().optional(),
  // Scope the key to specific resource:action pairs (see lib/scopes.ts).
  // Omit entirely for a full-access key.
  permissions: apiKeyPermissionsSchema.optional(),
});

/**
 * Creates an API key with optional scoped permissions. On cloud: blocks
 * free/basic plans. Rate limits are not stamped onto the key — they are
 * resolved from the owner's current plan on every request (lib/apiRateLimit.ts),
 * so an upgrade applies to keys that already exist.
 */
export async function createUserApiKey(
  request: FastifyRequest<{ Body: { name: string; expiresIn?: number; permissions?: Record<string, string[]> } }>,
  reply: FastifyReply
) {
  const session = await getSessionFromReq(request);
  if (!session?.user?.id) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const parsed = createApiKeyBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid request body" });
  }
  const { name, expiresIn, permissions } = parsed.data;

  let planName: string | null = null;

  if (IS_CLOUD) {
    const activeOrgId = (session.session as any).activeOrganizationId;
    if (!activeOrgId) {
      return reply.status(400).send({ error: "No active organization" });
    }

    const subscription = await getSubscriptionInner(activeOrgId);
    planName = subscription?.planName || "free";

    if (planName === "free" || planName.includes("basic")) {
      return reply.status(403).send({
        error: "API keys require a Standard or Pro plan. Please upgrade to create API keys.",
      });
    }
  }

  const keyLimit = apiKeyLimitForPlan(planName);

  try {
    const outcome = await createApiKeyWithinLimit(session.user.id, keyLimit, () =>
      auth.api.createApiKey({
        body: {
          name,
          expiresIn: expiresIn ?? undefined,
          userId: session.user.id,
          ...(permissions ? { permissions: permissions as Record<string, string[]> } : {}),
        },
      })
    );

    if (!outcome.allowed) {
      return reply.status(403).send({
        error: `You have reached your limit of ${keyLimit} API keys. Delete an unused key or upgrade your plan.`,
      });
    }

    return reply.send(outcome.result);
  } catch (error: unknown) {
    // Surface better-auth's own 4xx rejections by message; anything else stays
    // a generic 500 so internal error detail never reaches the client.
    const err = error as { name?: string; statusCode?: unknown; message?: string };
    if (
      err?.name === "APIError" &&
      typeof err.statusCode === "number" &&
      err.statusCode >= 400 &&
      err.statusCode < 500
    ) {
      return reply.status(err.statusCode).send({ error: err.message || "Failed to create API key" });
    }
    request.log.error({ err: error }, "Error creating API key");
    return reply.status(500).send({ error: "Failed to create API key" });
  }
}
