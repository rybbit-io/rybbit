import { FastifyReply } from "fastify";

/**
 * Parse a route param as a positive integer. On failure, sends a 400 response
 * with `{ error: errorMessage }` and returns null so the caller can early-return:
 *
 *   const siteId = parsePositiveInteger(request.params.siteId, reply, "Invalid site ID");
 *   if (siteId === null) return;
 */
export function parsePositiveInteger(
  paramValue: string,
  reply: FastifyReply,
  errorMessage = "Invalid parameter"
): number | null {
  const parsed = parseInt(paramValue, 10);
  if (isNaN(parsed) || parsed <= 0) {
    reply.status(400).send({ error: errorMessage });
    return null;
  }
  return parsed;
}
