import type { FastifyInstance } from "fastify";

interface StructuredApiError extends Record<string, unknown> {
  code: string;
  error: string;
  message: string;
  resolution: string;
}

const defaultsByStatus: Record<number, { code: string; message: string; resolution: string }> = {
  400: {
    code: "INVALID_REQUEST",
    message: "The request is invalid.",
    resolution: "Check the request parameters and body against https://rybbit.com/openapi.json.",
  },
  401: {
    code: "AUTHENTICATION_REQUIRED",
    message: "Authentication is required.",
    resolution: "Send a valid API key in the Authorization header as a Bearer token.",
  },
  403: {
    code: "FORBIDDEN",
    message: "The credential does not have permission for this operation.",
    resolution: "Use a credential with the required scope and Site or Organization access.",
  },
  404: {
    code: "NOT_FOUND",
    message: "The requested API resource was not found.",
    resolution: "Check identifiers and paths against https://rybbit.com/openapi.json.",
  },
  405: {
    code: "METHOD_NOT_ALLOWED",
    message: "The HTTP method is not supported for this path.",
    resolution: "Choose a method listed for this path in https://rybbit.com/openapi.json.",
  },
  409: {
    code: "CONFLICT",
    message: "The request conflicts with the current resource state.",
    resolution: "Refresh the resource, resolve the conflicting state, and retry.",
  },
  413: {
    code: "PAYLOAD_TOO_LARGE",
    message: "The request body is too large.",
    resolution: "Reduce the payload size or split it into smaller requests.",
  },
  415: {
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "The request media type is not supported.",
    resolution: "Send JSON with Content-Type: application/json unless the operation documents another type.",
  },
  429: {
    code: "RATE_LIMITED",
    message: "Rate limit exceeded.",
    resolution: "Wait for the advertised retry period, then retry the request.",
  },
  500: {
    code: "INTERNAL_ERROR",
    message: "The server could not complete the request.",
    resolution: "Retry with exponential backoff. Contact support if the error persists.",
  },
};

function defaultsFor(statusCode: number) {
  return defaultsByStatus[statusCode] ?? (statusCode >= 500 ? defaultsByStatus[500] : defaultsByStatus[400]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeApiError(statusCode: number, payload: unknown): StructuredApiError {
  const existing = isRecord(payload)
    ? payload
    : typeof payload === "string"
      ? { error: payload }
      : Array.isArray(payload)
        ? { details: payload }
        : {};
  const defaults = defaultsFor(statusCode);
  const message =
    typeof existing.message === "string"
      ? existing.message
      : typeof existing.error === "string"
        ? existing.error
        : defaults.message;

  return {
    ...existing,
    error: typeof existing.error === "string" ? existing.error : message,
    code: typeof existing.code === "string" ? existing.code : defaults.code,
    message,
    resolution: typeof existing.resolution === "string" ? existing.resolution : defaults.resolution,
  };
}

function pathname(url: string): string {
  return url.split("?", 1)[0];
}

function isApiPath(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

function isMcpPath(path: string): boolean {
  return path === "/api/mcp" || path.startsWith("/api/mcp/");
}

function serializedPayloadValue(payload: unknown): unknown {
  const text = Buffer.isBuffer(payload) ? payload.toString("utf8") : typeof payload === "string" ? payload : undefined;
  if (text === undefined) return payload;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function registerApiErrorResponses(server: FastifyInstance): void {
  server.addHook("onSend", async (request, reply, payload) => {
    const path = pathname(request.url);
    if (reply.statusCode < 400 || !isApiPath(path) || isMcpPath(path)) return payload;

    const normalized = normalizeApiError(reply.statusCode, serializedPayloadValue(payload));
    reply.type("application/json; charset=utf-8");
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.removeHeader("Content-Length");
    return JSON.stringify(normalized);
  });

  server.setNotFoundHandler(async (request, reply) => {
    const path = pathname(request.url);
    if (isApiPath(path)) {
      return reply.status(404).send({
        error: `No API route matches ${request.method} ${path}.`,
        code: "API_ROUTE_NOT_FOUND",
        message: `No API route matches ${request.method} ${path}.`,
        resolution: "Read https://rybbit.com/openapi.json and choose a documented operation.",
        details: { method: request.method, path },
      });
    }

    return reply.status(404).send({
      error: "Resource not found.",
      code: "NOT_FOUND",
      message: "Resource not found.",
      resolution: "Check the requested path and try again.",
    });
  });
}
