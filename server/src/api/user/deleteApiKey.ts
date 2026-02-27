import { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../../lib/auth.js";

export const deleteApiKey = async (
  request: FastifyRequest<{ Params: { keyId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { keyId } = request.params;

    if (!keyId) {
      return reply.status(400).send({ error: "Key ID is required" });
    }

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
