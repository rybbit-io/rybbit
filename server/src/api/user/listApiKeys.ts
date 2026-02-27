import { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../../lib/auth.js";

export const listApiKeys = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const apiKeys = await auth.api.listApiKeys({
      headers: request.headers as any,
    });

    return reply.send(apiKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return reply.status(500).send({ error: "Failed to fetch API keys" });
  }
};
