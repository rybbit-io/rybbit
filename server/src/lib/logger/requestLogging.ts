import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// Routes the tracking script hits on customer pages. Their successes are logged at
// debug; failures keep their normal level.
const HIGH_VOLUME_SUCCESS_ROUTES = new Set([
  "/api/identify",
  "/api/metrics.js",
  "/api/replay.js",
  "/api/script.js",
  "/api/site/:siteId/feature-flags/evaluate",
  "/api/site/tracking-config/:siteId",
  "/api/track",
]);

function requestRoute(request: FastifyRequest): string {
  return request.routeOptions?.url ?? requestPath(request);
}

function requestPath(request: FastifyRequest): string {
  return request.url.split("?", 1)[0];
}

function isHighVolumeSuccess(request: FastifyRequest, route: string): boolean {
  // CORS preflights are answered by @fastify/cors before routing; a rejected one
  // is a 404 and still logs as a client error.
  if (request.method === "OPTIONS") return true;
  return HIGH_VOLUME_SUCCESS_ROUTES.has(route) || route.endsWith("/session-replay/record/:siteId");
}

function responseTimeMs(reply: FastifyReply): number {
  return Math.round(reply.elapsedTime * 100) / 100;
}

function requestContext(request: FastifyRequest, reply: FastifyReply, statusCode = reply.statusCode) {
  return {
    method: request.method,
    url: requestPath(request),
    route: requestRoute(request),
    statusCode,
    responseTimeMs: responseTimeMs(reply),
  };
}

function errorStatusCode(error: FastifyError, reply: FastifyReply): number {
  if (typeof error.statusCode === "number") return error.statusCode;
  if (reply.statusCode >= 400) return reply.statusCode;
  return 500;
}

export function registerRequestLogging(fastify: FastifyInstance): void {
  const requestsWithThrownErrors = new WeakSet<FastifyRequest>();

  fastify.addHook("onError", (request, reply, error, done) => {
    requestsWithThrownErrors.add(request);
    const statusCode = errorStatusCode(error, reply);
    const context = { err: error, ...requestContext(request, reply, statusCode) };

    if (statusCode >= 500) {
      request.log.error(context, "Request failed");
    } else {
      request.log.warn(context, "Request failed");
    }

    done();
  });

  fastify.addHook("onResponse", (request, reply, done) => {
    if (requestsWithThrownErrors.delete(request)) {
      done();
      return;
    }

    const context = requestContext(request, reply);

    if (reply.statusCode >= 500) {
      request.log.error(context, "Request completed with server error");
    } else if (reply.statusCode >= 400) {
      request.log.warn(context, "Request completed with client error");
    } else if (isHighVolumeSuccess(request, context.route)) {
      request.log.debug(context, "Request completed");
    } else {
      request.log.info(context, "Request completed");
    }

    done();
  });
}
