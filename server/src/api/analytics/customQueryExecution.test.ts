import { ClickHouseError } from "@clickhouse/client";
import Fastify, { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), getSitesUserHasAccessTo: vi.fn() }));
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouseQuery: { query: mocks.query } }));
vi.mock("../../lib/auth-utils.js", () => ({ getSitesUserHasAccessTo: mocks.getSitesUserHasAccessTo }));

import { runCustomQuery } from "./runCustomQuery.js";
import { runDashboardCardQuery } from "./runDashboardCardQuery.js";

let app: FastifyInstance;

beforeEach(async () => {
  vi.resetAllMocks();
  mocks.getSitesUserHasAccessTo.mockResolvedValue([{ siteId: 1, organizationId: "org-1" }]);
  app = Fastify();
  app.post<{ Params: { organizationId: string }; Body: unknown }>(
    "/organizations/:organizationId/query",
    runCustomQuery
  );
  app.post<{ Params: { siteId: string }; Body: unknown }>("/sites/:siteId/run-card", runDashboardCardQuery);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe.each(["/organizations/org-1/query", "/sites/1/run-card"])("custom SQL response at %s", url => {
  const request = () => app.inject({ method: "POST", url, payload: { query: "SELECT count() FROM scoped_events" } });

  it.each(["query", "json"])("returns an actionable SDK timeout raised during %s", async stage => {
    const error = new ClickHouseError({
      code: "159",
      type: "TIMEOUT_EXCEEDED",
      message: "Timeout exceeded: elapsed 60040 ms, maximum: 60000 ms.",
    });
    if (stage === "query") {
      mocks.query.mockRejectedValue(error);
    } else {
      mocks.query.mockResolvedValue({
        json: async () => {
          throw error;
        },
      });
    }

    const response = await request();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Query exceeded the 60-second time limit. Try a shorter date range or simplify the query.",
    });
  });

  it("returns the SQL error instead of a generic failure", async () => {
    mocks.query.mockRejectedValue(
      new ClickHouseError({
        code: "47",
        type: "UNKNOWN_IDENTIFIER",
        message: "Unknown expression identifier 'missing_column'",
      })
    );

    const response = await request();
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Unknown expression identifier 'missing_column'" });
  });

  it("reports the 60-second execution limit for successful queries", async () => {
    mocks.query.mockResolvedValue({ query_id: "test-query", json: async () => [{ count: 1 }] });
    const response = await request();
    expect(response.statusCode).toBe(200);
    expect(response.json().meta).toEqual({
      queryId: "test-query",
      rowCount: 1,
      maxExecutionTimeSeconds: 60,
      maxRows: 1000,
    });
  });
});
