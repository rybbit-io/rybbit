import type { FastifyInstance } from "fastify";

export class RybbitApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RybbitApiError";
  }
}

/**
 * Calls the existing REST API in-process via fastify.inject(), forwarding the
 * MCP request's Authorization header. Requests run through the full route
 * lifecycle (API key verification, site access checks, rate limits, time
 * param validation) exactly as if they arrived over HTTP.
 */
export class RybbitApiClient {
  constructor(
    private readonly fastify: FastifyInstance,
    private readonly authorization: string
  ) {}

  async call<T = unknown>(
    method: "GET" | "POST",
    path: string,
    options: { query?: Record<string, string | number | undefined>; body?: unknown } = {}
  ): Promise<T> {
    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) {
        query[key] = String(value);
      }
    }

    const response = await this.fastify.inject({
      method,
      url: `/api${path}`,
      query,
      headers: {
        authorization: this.authorization,
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(options.body !== undefined ? { payload: JSON.stringify(options.body) } : {}),
    });

    let parsed: unknown;
    try {
      parsed = response.json();
    } catch {
      parsed = response.body;
    }

    if (response.statusCode >= 400) {
      const message =
        parsed !== null && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : `Request failed with status ${response.statusCode}`;
      throw new RybbitApiError(response.statusCode, message);
    }

    return parsed as T;
  }
}
