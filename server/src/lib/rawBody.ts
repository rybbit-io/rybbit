import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    // Exact request bytes. Only set on routes in a scope that called keepRawJsonBody.
    rawBody?: Buffer;
  }
}

/**
 * Parses JSON bodies in the calling plugin's scope while keeping the exact
 * bytes on request.rawBody. Webhook senders (Stripe, AppSumo) sign those bytes,
 * so a re-serialized body would never verify.
 */
export function keepRawJsonBody(fastify: FastifyInstance) {
  fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
    const raw = body as Buffer;
    request.rawBody = raw;
    try {
      done(null, JSON.parse(raw.toString("utf8")));
    } catch (error) {
      (error as { statusCode?: number }).statusCode = 400;
      done(error as Error, undefined);
    }
  });
}
