import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAnalyticsQueryService,
  type AnalyticsQueryRunner,
} from "../../services/analytics/analyticsQueryService.js";
import { createRybbitMcpServer } from "./server.js";

const connections: Array<{ client: Client; server: ReturnType<typeof createRybbitMcpServer> }> = [];

afterEach(async () => {
  await Promise.all(connections.splice(0).map(({ client, server }) => Promise.all([client.close(), server.close()])));
});

async function connectServer() {
  const run = vi.fn(async () => ({
    data: [
      {
        sessions: 3,
        pageviews: 8,
        users: 2,
        pages_per_session: 2.67,
        bounce_rate: 33.33,
        session_duration: 21,
      },
    ],
    queryId: "query_mcp",
  }));
  const analytics = createAnalyticsQueryService({ run } as unknown as AnalyticsQueryRunner);
  const server = createRybbitMcpServer(
    {
      userId: "user_1",
      sites: [{ siteId: 7, organizationId: "org_1", name: "Example", domain: "example.com", type: "web" }],
    },
    { analytics }
  );
  const client = new Client({ name: "rybbit-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  connections.push({ client, server });
  return { client, run };
}

describe("Rybbit MCP server", () => {
  it("advertises the read-only analytics tool surface", async () => {
    const { client } = await connectServer();
    const tools = await client.listTools();

    expect(tools.tools.map(tool => tool.name)).toEqual([
      "get_context",
      "query_overview",
      "query_timeseries",
      "query_breakdown",
      "query_funnel",
      "query_errors",
    ]);
    expect(tools.tools.every(tool => tool.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("returns structured context without invoking ClickHouse", async () => {
    const { client, run } = await connectServer();
    const result = await client.callTool({ name: "get_context", arguments: {} });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      organizations: [
        {
          organizationId: "org_1",
          sites: [{ siteId: 7, organizationId: "org_1", name: "Example", domain: "example.com", type: "web" }],
        },
      ],
      siteCount: 1,
      matchingSiteCount: 1,
      returnedSiteCount: 1,
      truncated: false,
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("executes a typed overview tool and returns structured analytics", async () => {
    const { client, run } = await connectServer();
    const result = await client.callTool({
      name: "query_overview",
      arguments: {
        siteId: 7,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        timezone: "UTC",
      },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ sessions: 3, pageviews: 8 }),
        meta: expect.objectContaining({ siteId: 7, queryId: "query_mcp" }),
      })
    );
    expect(run).toHaveBeenCalledOnce();
  });

  it("returns a model-correctable tool error for inaccessible sites", async () => {
    const { client, run } = await connectServer();
    const result = await client.callTool({
      name: "query_overview",
      arguments: {
        siteId: 999,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: "You do not have access to Rybbit site 999" }]);
    expect(run).not.toHaveBeenCalled();
  });
});
