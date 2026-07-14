import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mcpRoutes } from "./index.js";

const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  authorization: "Bearer rb_test_key",
};

function rpc(method: string, params?: unknown, id = 1) {
  return { jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) };
}

async function callTool(app: FastifyInstance, name: string, args: Record<string, unknown> = {}) {
  const response = await app.inject({
    method: "POST",
    url: "/api/mcp",
    headers: MCP_HEADERS,
    payload: rpc("tools/call", { name, arguments: args }),
  });
  expect(response.statusCode).toBe(200);
  return response.json().result;
}

describe("mcp endpoint", () => {
  let app: FastifyInstance;
  // Captures what the MCP tools forward to the REST API
  let captured: { url?: string; query?: Record<string, unknown>; authorization?: string; body?: unknown };

  beforeEach(async () => {
    app = Fastify();
    captured = {};

    app.register(
      async fastify => {
        await fastify.register(mcpRoutes);

        fastify.get("/organizations", async request => {
          captured.authorization = request.headers.authorization;
          return [
            {
              id: "org_1",
              name: "Acme",
              slug: "acme",
              role: "owner",
              members: [{ user: { email: "secret@acme.com" } }],
              sites: [{ id: "5", name: "Acme Site", domain: "acme.com", public: false }],
            },
          ];
        });

        fastify.get("/sites/:siteId/overview", async request => {
          captured.url = request.url;
          captured.query = request.query as Record<string, unknown>;
          return { data: { sessions: 100, pageviews: 250 } };
        });

        fastify.get("/sites/:siteId/metric", async () => {
          return { data: [{ value: "/pricing", count: 40, percentage: 40 }], totalCount: 1 };
        });

        fastify.post("/sites/:siteId/funnels/analyze", async request => {
          captured.body = request.body;
          captured.query = request.query as Record<string, unknown>;
          return [{ step_number: 1, visitors: 10, conversion_rate: 100, dropoff_rate: 0 }];
        });

        fastify.get("/sites/:siteId/goals", async (_request, reply) => {
          return reply.status(403).send({ error: "You don't have access to this site" });
        });
      },
      { prefix: "/api" }
    );

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("rejects requests without an Authorization header", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: { "content-type": "application/json", accept: MCP_HEADERS.accept },
      payload: rpc("tools/list"),
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["www-authenticate"]).toContain("Bearer");
    expect(response.json().error.message).toContain("API key");
  });

  it("rejects GET requests (stateless server)", async () => {
    const response = await app.inject({ method: "GET", url: "/api/mcp", headers: MCP_HEADERS });
    expect(response.statusCode).toBe(405);
  });

  it("responds to initialize", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: MCP_HEADERS,
      payload: rpc("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      }),
    });

    expect(response.statusCode).toBe(200);
    const result = response.json().result;
    expect(result.serverInfo.name).toBe("rybbit");
    expect(result.instructions).toContain("list_sites");
  });

  it("lists the analytics tools with read-only annotations", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: MCP_HEADERS,
      payload: rpc("tools/list"),
    });

    expect(response.statusCode).toBe(200);
    const tools = response.json().result.tools as { name: string; annotations?: { readOnlyHint?: boolean } }[];
    const names = tools.map(tool => tool.name);

    expect(names).toContain("list_sites");
    expect(names).toContain("get_overview");
    expect(names).toContain("get_breakdown");
    expect(names).toContain("analyze_funnel");
    expect(names).toContain("run_query");
    expect(names).toContain("get_query_schema");
    expect(tools.every(tool => tool.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("list_sites forwards the API key and strips member details", async () => {
    const result = await callTool(app, "list_sites");

    expect(captured.authorization).toBe("Bearer rb_test_key");
    const orgs = JSON.parse(result.content[0].text);
    expect(orgs).toEqual([
      {
        organization_id: "org_1",
        name: "Acme",
        slug: "acme",
        role: "owner",
        sites: [{ site_id: 5, name: "Acme Site", domain: "acme.com", public: false }],
      },
    ]);
    expect(result.content[0].text).not.toContain("secret@acme.com");
  });

  it("get_overview maps past_minutes and filters onto REST query params", async () => {
    const result = await callTool(app, "get_overview", {
      site_id: 5,
      past_minutes: 60,
      filters: [{ parameter: "device_type", type: "equals", value: ["Mobile"] }],
    });

    expect(result.isError).toBeFalsy();
    expect(captured.url).toContain("/api/sites/5/overview");
    expect(captured.query).toMatchObject({
      past_minutes_start: "60",
      past_minutes_end: "0",
      filters: JSON.stringify([{ parameter: "device_type", type: "equals", value: ["Mobile"] }]),
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ data: { sessions: 100, pageviews: 250 } });
  });

  it("get_overview defaults time_zone when dates are provided", async () => {
    await callTool(app, "get_overview", { site_id: 5, start_date: "2026-07-01", end_date: "2026-07-07" });

    expect(captured.query).toMatchObject({
      start_date: "2026-07-01",
      end_date: "2026-07-07",
      time_zone: "UTC",
    });
    expect(captured.query).not.toHaveProperty("past_minutes_start");
  });

  it("analyze_funnel sends steps as the POST body", async () => {
    const steps = [
      { type: "page", value: "/pricing" },
      { type: "event", value: "signup" },
    ];
    const result = await callTool(app, "analyze_funnel", { site_id: 5, steps, past_minutes: 1440 });

    expect(result.isError).toBeFalsy();
    expect(captured.body).toEqual({ steps });
    expect(captured.query).toMatchObject({ past_minutes_start: "1440" });
  });

  it("surfaces REST errors as tool errors with a hint", async () => {
    const result = await callTool(app, "get_goals", { site_id: 5 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("403");
    expect(result.content[0].text).toContain("You don't have access to this site");
    expect(result.content[0].text).toContain("list_sites");
  });

  it("rejects invalid tool arguments before hitting the API", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: MCP_HEADERS,
      payload: rpc("tools/call", { name: "get_overview", arguments: { site_id: "not-a-number" } }),
    });

    expect(response.statusCode).toBe(200);
    const error = response.json().error;
    expect(error.code).toBe(-32602);
    expect(error.message).toContain("site_id");
    expect(captured.url).toBeUndefined();
  });
});
