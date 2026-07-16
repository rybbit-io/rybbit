import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpAuthenticator, extractBearerToken } from "./auth.js";
import { mcpRoutes, type McpRouteOptions } from "./index.js";

describe("extractBearerToken", () => {
  // Must mirror the REST layer's parsing exactly (startsWith("Bearer ") +
  // substring(7)) so the MCP gate and the routes it proxies never disagree.
  it("accepts the canonical form", () => {
    expect(extractBearerToken("Bearer rb_key")).toBe("rb_key");
  });

  it("rejects a lowercase scheme, matching the case-sensitive REST parser", () => {
    expect(extractBearerToken("bearer rb_key")).toBeNull();
  });

  it("returns null for an empty token", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
  });

  it("preserves the substring exactly (no trimming) so it matches REST", () => {
    expect(extractBearerToken("Bearer  rb_key")).toBe(" rb_key");
  });

  it("returns null for non-string or missing headers", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken(["Bearer a"])).toBeNull();
  });
});

const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  authorization: "Bearer rb_test_key",
};

function rpc(method: string, params?: unknown, id = 1) {
  return { jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) };
}

// Exercises the real authenticator logic with fake better-auth verifiers.
const authenticate = createMcpAuthenticator({
  verifyApiKey: async apiKey => {
    if (apiKey === "rb_test_key") return { valid: true, key: { referenceId: "user_1" } };
    if (apiKey === "rb_scoped_key") {
      return {
        valid: true,
        key: { referenceId: "user_1", permissions: { goals: ["read", "write"], sites: ["read"] } },
      };
    }
    if (apiKey === "rb_limited_key") return { valid: false, error: { code: "RATE_LIMITED" } };
    return { valid: false, error: { code: "KEY_NOT_FOUND" } };
  },
  getOAuthSession: async bearerToken => {
    if (bearerToken === "oauth_valid_token") {
      // Legacy grant: standard scopes only = unrestricted.
      return { userId: "user_2", accessTokenExpiresAt: new Date(Date.now() + 3600_000), scopes: "openid" };
    }
    if (bearerToken === "oauth_scoped_token") {
      return {
        userId: "user_2",
        accessTokenExpiresAt: new Date(Date.now() + 3600_000),
        scopes: "openid analytics:read",
      };
    }
    if (bearerToken === "oauth_expired_token") {
      return { userId: "user_2", accessTokenExpiresAt: new Date(Date.now() - 1000) };
    }
    return null;
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

async function listTools(
  app: FastifyInstance,
  authorization = MCP_HEADERS.authorization
): Promise<{ name: string; annotations?: Record<string, unknown>; outputSchema?: unknown }[]> {
  const response = await app.inject({
    method: "POST",
    url: "/api/mcp",
    headers: { ...MCP_HEADERS, authorization },
    payload: rpc("tools/list"),
  });
  expect(response.statusCode).toBe(200);
  return response.json().result.tools;
}

describe("mcp endpoint", () => {
  let app: FastifyInstance;
  // Captures what the MCP tools forward to the REST API
  let captured: {
    url?: string;
    method?: string;
    query?: Record<string, unknown>;
    authorization?: string;
    body?: unknown;
  };

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

        fastify.post("/sites/:siteId/goals", async request => {
          captured.url = request.url;
          captured.method = request.method;
          captured.body = request.body;
          return { success: true, goalId: 42 };
        });

        fastify.post("/sites/:siteId/funnels", async request => {
          captured.url = request.url;
          captured.body = request.body;
          return { success: true, funnelId: 7 };
        });

        fastify.delete("/sites/:siteId", async request => {
          captured.url = request.url;
          captured.method = request.method;
          return { success: true };
        });

        fastify.post("/organizations/:organizationId/members", async request => {
          captured.url = request.url;
          captured.body = request.body;
          return { message: "User added to organization successfully" };
        });

        fastify.post("/sites/:siteId/users/identify", async request => {
          captured.url = request.url;
          captured.body = request.body;
          return { success: true };
        });
      },
      { prefix: "/api" }
    );
    await instance.ready();
    return instance;
  }

  beforeEach(async () => {
    captured = {};
    app = await buildApp({ authenticate });
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

  it("accepts OAuth access tokens as the bearer credential", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: { ...MCP_HEADERS, authorization: "Bearer oauth_valid_token" },
      payload: rpc("tools/list"),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().result.tools.length).toBeGreaterThan(0);
  });

  it("rejects expired OAuth access tokens", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/mcp",
      headers: { ...MCP_HEADERS, authorization: "Bearer oauth_expired_token" },
      payload: rpc("tools/list"),
    });

    expect(response.statusCode).toBe(401);
  });

  it("advertises RFC 9728 resource metadata on 401 when BASE_URL is set", async () => {
    const previousBaseUrl = process.env.BASE_URL;
    process.env.BASE_URL = "https://rybbit.example.com";
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/mcp",
        headers: { ...MCP_HEADERS, authorization: "Bearer rb_wrong_key" },
        payload: rpc("tools/list"),
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers["www-authenticate"]).toContain(
        'resource_metadata="https://rybbit.example.com/.well-known/oauth-protected-resource"'
      );
      expect(response.headers["access-control-expose-headers"]).toContain("WWW-Authenticate");
    } finally {
      if (previousBaseUrl === undefined) {
        delete process.env.BASE_URL;
      } else {
        process.env.BASE_URL = previousBaseUrl;
      }
    }
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

  it("lists all 39 tools with output schemas", async () => {
    const tools = await listTools(app);
    const names = tools.map(tool => tool.name);

    expect(tools).toHaveLength(39);
    expect(names).toContain("list_sites");
    expect(names).toContain("get_overview");
    expect(names).toContain("get_breakdown");
    expect(names).toContain("analyze_funnel");
    expect(names).toContain("get_sessions");
    expect(names).toContain("run_query");
    expect(names).toContain("get_query_schema");
    expect(names).toContain("create_goal");
    expect(names).toContain("get_users");
    expect(names).toContain("list_members");

    const overview = tools.find(tool => tool.name === "get_overview");
    expect(overview?.outputSchema).toBeTruthy();
  });

  it("filters tools/list to the API key's scopes, keeping list_sites", async () => {
    const tools = await listTools(app, "Bearer rb_scoped_key");
    const names = tools.map(tool => tool.name).sort();

    // goals read+write, sites read (write implies read is covered elsewhere).
    expect(names).toEqual(["create_goal", "delete_goal", "get_goals", "get_site", "list_sites", "update_goal"]);
  });

  it("filters tools/list to the OAuth grant's scopes", async () => {
    const tools = await listTools(app, "Bearer oauth_scoped_token");
    const names = tools.map(tool => tool.name);

    expect(names).toContain("list_sites");
    expect(names).toContain("get_overview");
    expect(names).toContain("get_web_vitals");
    expect(names).not.toContain("get_sessions");
    expect(names).not.toContain("create_goal");
    expect(names).not.toContain("run_query");
  });

  it("legacy OAuth grants with only standard scopes stay unrestricted", async () => {
    const tools = await listTools(app, "Bearer oauth_valid_token");
    expect(tools).toHaveLength(39);
  });

  it("partitions tools into reads, writes, and destructive deletes", async () => {
    const tools = await listTools(app);

    expect(tools.every(tool => typeof tool.annotations?.readOnlyHint === "boolean")).toBe(true);

    const destructive = tools
      .filter(tool => tool.annotations?.destructiveHint)
      .map(tool => tool.name)
      .sort();
    expect(destructive).toEqual(["delete_funnel", "delete_goal", "delete_site", "delete_team", "delete_user"]);

    const writes = tools
      .filter(tool => tool.annotations?.readOnlyHint === false)
      .map(tool => tool.name)
      .sort();
    expect(writes).toEqual(
      [
        "add_member",
        "create_goal",
        "create_site",
        "create_team",
        "delete_funnel",
        "delete_goal",
        "delete_site",
        "delete_team",
        "delete_user",
        "identify_user",
        "save_funnel",
        "update_goal",
        "update_member_site_access",
        "update_site_config",
        "update_team",
        "update_user_traits",
      ].sort()
    );

    const reads = tools.filter(tool => tool.annotations?.readOnlyHint === true);
    expect(reads.every(tool => tool.annotations?.destructiveHint === false)).toBe(true);

    const updates = tools.filter(tool => tool.name.startsWith("update_"));
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.every(tool => tool.annotations?.idempotentHint === true)).toBe(true);
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

  it("rejects mixing past_minutes with an explicit date range instead of silently picking one", async () => {
    const result = await callTool(app, "get_overview", {
      site_id: 5,
      past_minutes: 60,
      start_date: "2026-07-01",
      end_date: "2026-07-07",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not both");
    // The conflicting call never reaches the REST layer.
    expect(captured.url).toBeUndefined();
  });

  it("get_sessions passes rows through but strips bidi control characters", async () => {
    const result = await callTool(app, "get_sessions", { site_id: 5 });

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text as string;
    expect(text).not.toContain("\u202E");
    const row = result.structuredContent.data[0];
    // Full REST parity: session rows are returned as the API sends them.
    expect(row.ip).toBe("203.0.113.7");
    expect(row.user_id).toBe("device_1");
    expect(row.entry_page).toBe("/pricing desrever");
  });

  it("create_goal maps goal_type onto the REST body", async () => {
    const result = await callTool(app, "create_goal", {
      site_id: 5,
      name: "Signups",
      goal_type: "event",
      config: { eventName: "signup" },
    });

    expect(result.isError).toBeFalsy();
    expect(captured.url).toBe("/api/sites/5/goals");
    expect(captured.method).toBe("POST");
    expect(captured.body).toEqual({ name: "Signups", goalType: "event", config: { eventName: "signup" } });
    expect(result.structuredContent).toEqual({ success: true, goalId: 42 });
  });

  it("save_funnel maps funnel_id onto the REST reportId", async () => {
    const steps = [
      { type: "page", value: "/pricing" },
      { type: "event", value: "signup" },
    ];
    const result = await callTool(app, "save_funnel", { site_id: 5, name: "Signup funnel", steps, funnel_id: 7 });

    expect(result.isError).toBeFalsy();
    expect(captured.url).toBe("/api/sites/5/funnels");
    expect(captured.body).toEqual({ name: "Signup funnel", steps, reportId: 7 });
    expect(result.structuredContent).toEqual({ success: true, funnelId: 7 });
  });

  it("delete_site issues a DELETE to the site route", async () => {
    const result = await callTool(app, "delete_site", { site_id: 5 });

    expect(result.isError).toBeFalsy();
    expect(captured.url).toBe("/api/sites/5");
    expect(captured.method).toBe("DELETE");
    expect(result.structuredContent).toEqual({ success: true });
  });

  it("add_member tolerates responses without a success field", async () => {
    const result = await callTool(app, "add_member", {
      organization_id: "org_1",
      email: "new@acme.com",
      role: "member",
    });

    expect(result.isError).toBeFalsy();
    expect(captured.url).toBe("/api/organizations/org_1/members");
    expect(captured.body).toEqual({ email: "new@acme.com", role: "member" });
    expect(result.structuredContent).toEqual({ message: "User added to organization successfully" });
  });

  it("identify_user forwards the identify body verbatim", async () => {
    const result = await callTool(app, "identify_user", {
      site_id: 5,
      anonymous_id: "anon_1",
      user_id: "app_user_9",
      traits: { plan: "pro" },
    });

    expect(result.isError).toBeFalsy();
    expect(captured.url).toBe("/api/sites/5/users/identify");
    expect(captured.body).toEqual({ anonymous_id: "anon_1", user_id: "app_user_9", traits: { plan: "pro" } });
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
    expect(result.content[0].text).toContain("admin/owner role");
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
