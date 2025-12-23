import { FastifyRequest, FastifyReply } from "fastify";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { auth } from "../../lib/auth.js";

export const listApiKeys = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const session = await getSessionFromReq(request);

    if (!session?.user.id) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Use Better Auth to list API keys for the current user
    const apiKeys = await auth.api.listApiKeys({
      headers: request.headers as any,
    });

    return reply.send(apiKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return reply.status(500).send({ error: "Failed to fetch API keys" });
  }
};
