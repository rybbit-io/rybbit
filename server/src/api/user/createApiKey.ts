import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { auth } from "../../lib/auth.js";
import { IS_CLOUD } from "../../lib/const.js";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  expiresIn: z.number().optional(),
});

type CreateApiKeyBody = z.infer<typeof createApiKeySchema>;

export const createApiKey = async (request: FastifyRequest<{ Body: CreateApiKeyBody }>, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const validation = createApiKeySchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { name, expiresIn } = validation.data;

    const apiKey = await auth.api.createApiKey({
      body: {
        name,
        userId,
        expiresIn,
        prefix: "rb_",
        ...(IS_CLOUD && {
          rateLimitEnabled: true,
          // 10 minutes
          rateLimitTimeWindow: 1000 * 60 * 10,
          rateLimitMax: 500,
        }),
      },
    });

    return reply.send(apiKey);
  } catch (error) {
    console.error("Error creating API key:", error);
    return reply.status(500).send({ error: "Failed to create API key" });
  }
};
