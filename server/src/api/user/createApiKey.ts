import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { auth } from "../../lib/auth.js";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  expiresIn: z.number().optional(),
});

type CreateApiKeyBody = z.infer<typeof createApiKeySchema>;

export const createApiKey = async (request: FastifyRequest<{ Body: CreateApiKeyBody }>, reply: FastifyReply) => {
  try {
    const session = await getSessionFromReq(request);

    if (!session?.user.id) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Validate request body
    const validation = createApiKeySchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { name, expiresIn } = validation.data;

    // Create API key with Better Auth
    // Default rate limiting: 10,000 requests per day
    const apiKey = await auth.api.createApiKey({
      body: {
        name,
        userId: session.user.id,
        expiresIn,
        rateLimitEnabled: true,
        rateLimitTimeWindow: 1000 * 60 * 10, // 10 minutes
        rateLimitMax: 500,
        prefix: "rb_",
      },
    });

    // Return the full API key (including the key value)
    // This is the only time the key will be shown
    return reply.send(apiKey);
  } catch (error) {
    console.error("Error creating API key:", error);
    return reply.status(500).send({ error: "Failed to create API key" });
  }
};
