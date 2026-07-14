import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { McpAuthenticationError } from "./auth.js";
import { mcpRoutes } from "./routes.js";

const apps: Array<ReturnType<typeof Fastify>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
});

describe("MCP HTTP routes", () => {
  it("challenges unauthenticated POST requests", async () => {
    const app = Fastify();
    apps.push(app);
    await app.register(mcpRoutes, {
      authenticate: async () => {
        throw new McpAuthenticationError("Provide a Rybbit API key", 401);
      },
    });

    const response = await app.inject({ method: "POST", url: "/mcp", payload: {} });

    expect(response.statusCode).toBe(401);
    expect(response.headers["www-authenticate"]).toBe('Bearer realm="rybbit-mcp"');
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("returns retry guidance when API-key verification is rate limited", async () => {
    const app = Fastify();
    apps.push(app);
    await app.register(mcpRoutes, {
      authenticate: async () => {
        throw new McpAuthenticationError("API key rate limit exceeded", 429);
      },
    });

    const response = await app.inject({ method: "POST", url: "/mcp", payload: {} });

    expect(response.statusCode).toBe(429);
    expect(response.headers["retry-after"]).toBe("60");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("marks GET and DELETE unsupported for the stateless endpoint", async () => {
    const app = Fastify();
    apps.push(app);
    await app.register(mcpRoutes);

    for (const method of ["GET", "DELETE"] as const) {
      const response = await app.inject({ method, url: "/mcp" });
      expect(response.statusCode).toBe(405);
      expect(response.headers.allow).toBe("POST");
      expect(response.json()).toEqual(
        expect.objectContaining({
          jsonrpc: "2.0",
          error: expect.objectContaining({ code: -32000 }),
        })
      );
    }
  });

  it("handles an MCP initialize request over Streamable HTTP", async () => {
    const app = Fastify();
    apps.push(app);
    await app.register(mcpRoutes, {
      authenticate: async () => ({ userId: "user_1", sites: [] }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "route-test", version: "1.0.0" },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toContain("rybbit-analytics");

    const toolsResponse = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-protocol-version": "2025-11-25",
      },
      payload: {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      },
    });

    expect(toolsResponse.statusCode).toBe(200);
    expect(toolsResponse.json().result.tools.map((tool: { name: string }) => tool.name)).toContain("query_overview");
  });
});
