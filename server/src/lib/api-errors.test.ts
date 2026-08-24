import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { normalizeApiError, registerApiErrorResponses } from "./api-errors.js";

describe("normalizeApiError", () => {
  it("adds stable machine fields while preserving existing error details", () => {
    expect(normalizeApiError(429, { error: "Rate limit exceeded", scope: "daily", retryAfter: 30 })).toEqual({
      error: "Rate limit exceeded",
      code: "RATE_LIMITED",
      message: "Rate limit exceeded",
      resolution: "Wait for the advertised retry period, then retry the request.",
      scope: "daily",
      retryAfter: 30,
    });
  });

  it("preserves array error details instead of discarding them", () => {
    expect(normalizeApiError(400, [{ issue: "Missing site ID" }])).toMatchObject({
      code: "INVALID_REQUEST",
      details: [{ issue: "Missing site ID" }],
    });
  });
});

describe("registerApiErrorResponses", () => {
  it("returns structured JSON for unknown API paths and normalizes handler errors", async () => {
    const app = Fastify();
    registerApiErrorResponses(app);
    app.get("/api/example", async (_request, reply) => reply.status(400).send({ error: "Bad input" }));
    app.get("/api/success", async () => ({ ok: true }));

    const missing = await app.inject({ method: "GET", url: "/api/missing" });
    expect(missing.statusCode).toBe(404);
    expect(missing.headers["content-type"]).toContain("application/json");
    expect(missing.json()).toMatchObject({
      code: "API_ROUTE_NOT_FOUND",
      message: "No API route matches GET /api/missing.",
      resolution: expect.stringContaining("openapi.json"),
    });

    const invalid = await app.inject({ method: "GET", url: "/api/example" });
    expect(invalid.json()).toMatchObject({
      error: "Bad input",
      code: "INVALID_REQUEST",
      message: "Bad input",
      resolution: expect.any(String),
    });

    expect((await app.inject({ method: "GET", url: "/api/success" })).json()).toEqual({ ok: true });
    await app.close();
  });

  it("does not rewrite protocol-specific MCP errors", async () => {
    const app = Fastify();
    registerApiErrorResponses(app);
    app.post("/api/mcp", async (_request, reply) =>
      reply.status(400).send({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: null })
    );

    const response = await app.inject({ method: "POST", url: "/api/mcp" });
    expect(response.json()).toEqual({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request" },
      id: null,
    });
    await app.close();
  });

  it("normalizes thrown, string, array, and response-schema-constrained API errors", async () => {
    const app = Fastify();
    registerApiErrorResponses(app);
    app.get("/api/thrown", async () => {
      throw new Error("Unexpected failure");
    });
    app.get("/api/string", async (_request, reply) => reply.status(400).send("Bad string input"));
    app.get("/api/array", async (_request, reply) => reply.status(400).send([{ issue: "Missing site ID" }]));
    app.get(
      "/api/schema",
      {
        schema: {
          response: {
            400: {
              type: "object",
              properties: { error: { type: "string" } },
            },
          },
        },
      },
      async (_request, reply) => reply.status(400).send({ error: "Schema-constrained error" })
    );

    for (const path of ["/api/thrown", "/api/string", "/api/array", "/api/schema"]) {
      const response = await app.inject({ method: "GET", url: path });
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.json()).toMatchObject({
        code: expect.any(String),
        error: expect.any(String),
        message: expect.any(String),
        resolution: expect.any(String),
      });
    }

    expect((await app.inject({ method: "GET", url: "/api/array" })).json()).toMatchObject({
      details: [{ issue: "Missing site ID" }],
    });
    expect((await app.inject({ method: "GET", url: "/api/schema" })).json()).toMatchObject({
      code: "INVALID_REQUEST",
      message: "Schema-constrained error",
    });
    await app.close();
  });
});
