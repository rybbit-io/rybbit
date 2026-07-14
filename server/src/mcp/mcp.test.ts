import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpAuthenticator } from "./auth.js";
import { mcpRoutes, type McpRouteOptions } from "./index.js";

const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  authorization: "Bearer rb_test_key",
};

function rpc(method: string, params?: unknown, id = 1) {
  return { jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) };
}

// Exercises the real authenticator logic with a fake better-auth verifier.
const authenticate = createMcpAuthenticator({
  verifyApiKey: async apiKey => {
    if (apiKey === "rb_test_key") return { valid: true, key: { referenceId: "user_1" } };
    if (apiKey === "rb_limited_key") return { valid: false, error: { code: "RATE_LIMITED" } };
    return { valid: false, error: { code: "KEY_NOT_FOUND" } };
  },
});

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

async function listTools(app: FastifyInstance): Promise<{ name: string; annotations?: Record<string, unknown>; outputSchema?: unknown }[]> {
  const response = await app.inject({ method: "POST", url: "/api/mcp", headers: MCP_HEADERS, payload: rpc("tools/list") });
  expect(response.statusCode).toBe(200);
  return response.json().result.tools;
}

describe("mcp endpoint", () => {
  let app: FastifyInstance;
  let gatedApp: FastifyInstance;
  // Captures what the MCP tools forward to the REST API
  let captured: { url?: string; query?: Record<string, unknown>; authorization?: string; body?: unknown };

  async function buildApp(options: McpRouteOptions): Promise<FastifyInstance> {
    const instance = Fastify();
    instance.register(
      async fastify => {
        await fastify.register(mcpRoutes, options);

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
          return { data: { data: [{ value: "/pricing", count: 40, percentage: 40 }], totalCount: 1 } };
        });

        fastify.get("/sites/:siteId/sessions", async () => {
          return {
            data: [
              {
                session_id: "s1",
                user_id: "device_1",
                ip: "203.0.113.7",
                country: "US",
                entry_page: "/pricing\u202Edesrever",
              },
            ],
          };
        });

        fastify.post("/sites/:siteId/funnels/analyze", async request => {
          captured.body = request.body;
          captured.query = request.query as Record<string, unknown>;
          return { data: [{ step_number: 1, step_name: "Step 1", visitors: 10, conversion_rate: 100, dropoff_rate: 0 }] };
        });

        fastify.get("/sites/:siteId/goals", async (_request, reply) => {
          return reply.status(403).send({ error: "You don't have access to this site" });
        });
      },
      { prefix: "/api" }
    );
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    captured = {};
    app = await buildApp({ authenticate, enableRawDataTools: true });
    gatedApp = await buildApp({ authenticate });
  });

  afterEach(async () => {
    await app.close();
    await gatedApp.close();
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
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json().error.message).toContain("API key");
  });

  it("rejects invalid API keys before processing any MCP message", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: { ...MCP_HEADERS, authorization: "Bearer rb_wrong_key" },
      payload: rpc("tools/list"),
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["www-authenticate"]).toContain("Bearer");
    expect(response.json().error.message).toContain("Invalid");
  });

  it("maps rate-limited keys to 429 with Retry-After", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: { ...MCP_HEADERS, authorization: "Bearer rb_limited_key" },
      payload: rpc("tools/list"),
    });

    expect(response.statusCode).toBe(429);
    expect(response.headers["retry-after"]).toBe("60");
  });

  it("rejects GET requests (stateless server)", async () => {
    const response = await app.inject({ method: "GET", url: "/api/mcp", headers: MCP_HEADERS });
    expect(response.statusCode).toBe(405);
  });

  it("responds to initialize and keeps responses out of caches", async () => {
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
    expect(response.headers["cache-control"]).toBe("no-store");
    const result = response.json().result;
    expect(result.serverInfo.name).toBe("rybbit");
    expect(result.instructions).toContain("list_sites");
    expect(result.instructions).toContain("run_query");
  });

  it("lists the analytics tools with read-only annotations and output schemas", async () => {
    const tools = await listTools(app);
    const names = tools.map(tool => tool.name);

    expect(names).toContain("list_sites");
    expect(names).toContain("get_overview");
    expect(names).toContain("get_breakdown");
    expect(names).toContain("analyze_funnel");
    expect(names).toContain("get_sessions");
    expect(names).toContain("run_query");
    expect(names).toContain("get_query_schema");
    expect(tools.every(tool => tool.annotations?.readOnlyHint === true)).toBe(true);

    const overview = tools.find(tool => tool.name === "get_overview");
    expect(overview?.outputSchema).toBeTruthy();
  });

  it("hides raw data tools and run_query by default", async () => {
    const tools = await listTools(gatedApp);
    const names = tools.map(tool => tool.name);

    expect(names).toContain("get_overview");
    expect(names).toContain("analyze_funnel");
    expect(names).not.toContain("get_sessions");
    expect(names).not.toContain("get_events");
    expect(names).not.toContain("run_query");
    expect(names).not.toContain("get_query_schema");

    const response = await gatedApp.inject({
      method: "POST",
      url: "/api/mcp",
      headers: MCP_HEADERS,
      payload: rpc("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      }),
    });
    expect(response.json().result.instructions).not.toContain("run_query");
  });

  it("list_sites forwards the API key and strips member details", async () => {
    const result = await callTool(app, "list_sites");

    expect(captured.authorization).toBe("Bearer rb_test_key");
    const expected = {
      organizations: [
        {
          organization_id: "org_1",
          name: "Acme",
          slug: "acme",
          role: "owner",
          sites: [{ site_id: 5, name: "Acme Site", domain: "acme.com", public: false }],
        },
      ],
    };
    expect(JSON.parse(result.content[0].text)).toEqual(expected);
    expect(result.structuredContent).toEqual(expected);
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
    expect(result.structuredContent).toEqual({ data: { sessions: 100, pageviews: 250 } });
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

  it("get_sessions redacts IPs and strips bidi control characters", async () => {
    const result = await callTool(app, "get_sessions", { site_id: 5 });

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text as string;
    expect(text).not.toContain("203.0.113.7");
    expect(text).not.toContain("\u202E");
    const row = result.structuredContent.data[0];
    expect(row).not.toHaveProperty("ip");
    expect(row.user_id).toBe("device_1");
    expect(row.entry_page).toBe("/pricing desrever");
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
    // SDK 1.29 reports input validation failures as tool error results, so
    // the calling model can read and correct them.
    const result = response.json().result;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Input validation error");
    expect(result.content[0].text).toContain("site_id");
    expect(captured.url).toBeUndefined();
  });
});
