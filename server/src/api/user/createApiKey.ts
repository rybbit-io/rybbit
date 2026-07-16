import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { auth } from "../../lib/auth.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { apiKeyPermissionsSchema } from "../../lib/scopes.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";
import {
  API_RATE_LIMIT_WINDOW,
  IS_CLOUD,
  PRO_API_RATE_LIMIT,
  STANDARD_API_RATE_LIMIT,
} from "../../lib/const.js";

const createApiKeyBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  expiresIn: z.number().int().positive().optional(),
  // Scope the key to specific resource:action pairs (see lib/scopes.ts).
  // Omit entirely for a full-access key.
  permissions: apiKeyPermissionsSchema.optional(),
});

/**
 * Creates an API key with plan-appropriate rate limits and optional scoped
 * permissions. On cloud: blocks free/basic, sets standard or pro limits.
 * On self-hosted: uses standard limits as default.
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

  let rateLimitEnabled = false;
  let rateLimitMax: number | undefined;
  let rateLimitTimeWindow: number | undefined;

  if (IS_CLOUD) {
    const activeOrgId = (session.session as any).activeOrganizationId;
    if (!activeOrgId) {
      return reply.status(400).send({ error: "No active organization" });
    }

    const subscription = await getSubscriptionInner(activeOrgId);
    const planName = subscription?.planName || "free";

    if (planName === "free" || planName.includes("basic")) {
      return reply.status(403).send({
        error: "API keys require a Standard or Pro plan. Please upgrade to create API keys.",
      });
    }

    rateLimitEnabled = true;
    rateLimitTimeWindow = API_RATE_LIMIT_WINDOW;
    rateLimitMax =
      planName.includes("pro") || planName === "custom"
        ? PRO_API_RATE_LIMIT
        : STANDARD_API_RATE_LIMIT;
  }

  try {
    const result = await auth.api.createApiKey({
      body: {
        name,
        expiresIn: expiresIn ?? undefined,
        rateLimitEnabled,
        rateLimitTimeWindow,
        rateLimitMax,
        userId: session.user.id,
        ...(permissions ? { permissions: permissions as Record<string, string[]> } : {}),
      },
    });

    return reply.send(result);
  } catch (error: any) {
    return reply.status(500).send({ error: error.message || "Failed to create API key" });
  }
}
