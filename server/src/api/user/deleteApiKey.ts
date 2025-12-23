import { FastifyRequest, FastifyReply } from "fastify";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { auth } from "../../lib/auth.js";

export const deleteApiKey = async (
  request: FastifyRequest<{ Params: { keyId: string } }>,
  reply: FastifyReply
) => {
  try {
    const session = await getSessionFromReq(request);

    if (!session?.user.id) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Get keyId from URL params
    const { keyId } = request.params;

    if (!keyId) {
      return reply.status(400).send({ error: "Key ID is required" });
    }

    // Delete API key with Better Auth
    // Better Auth will verify that the key belongs to the authenticated user
    const result = await auth.api.deleteApiKey({
      body: { keyId },
      headers: request.headers as any,
    });

    return reply.send(result);
  } catch (error) {
    console.error("Error deleting API key:", error);
    return reply.status(500).send({ error: "Failed to delete API key" });
  }
};
