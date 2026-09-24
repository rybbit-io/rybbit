import Fastify, { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkApiKey: vi.fn(),
  getUserIsInOrg: vi.fn(),
  getSessionFromReq: vi.fn(),
  getSitesUserHasAccessTo: vi.fn(),
  siteIdsInOrganization: vi.fn(),
  query: vi.fn(),
}));
vi.mock("../../lib/auth-utils.js", () => mocks);
vi.mock("../../lib/access.js", () => ({ ...mocks }));
vi.mock("../../lib/siteConfig.js", () => ({ siteConfig: {} }));
vi.mock("../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { query: mocks.query } }));

import { requireOrgMember } from "../../lib/auth-middleware.js";
import { getSiteCards, getSiteCardsLite } from "./getSiteCards.js";

let app: FastifyInstance;
const allIds = Array.from({ length: 20 }, (_, i) => i + 1);
const comparison = { past_minutes_start: 2880, past_minutes_end: 1440, time_zone: "America/New_York" };

beforeEach(async () => {
  vi.resetAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-20T20:41:33Z"));
  mocks.checkApiKey.mockResolvedValue({ valid: false, role: null, statements: null });
  mocks.getUserIsInOrg.mockResolvedValue(true);
  mocks.getSessionFromReq.mockResolvedValue({ user: { id: "user-1" } });
  mocks.getSitesUserHasAccessTo.mockResolvedValue(allIds.map(siteId => ({ siteId, organizationId: "org-1" })));
  mocks.siteIdsInOrganization.mockImplementation(async ids => ids);
  mocks.query.mockImplementation(async ({ query }: { query: string }) => ({
    json: async () =>
      query.includes("AS current_sessions")
        ? [
            {
              site_id: 1,
              current_sessions: "12",
              current_users: "8",
              previous_sessions: "10",
              previous_users: "7",
            },
          ]
        : [
            {
              time: "2026-09-19 16:00:00",
              site_sessions: [
                [1, "3"],
                [2, "9"],
              ],
            },
            { time: "2026-09-19 17:00:00", site_sessions: [] },
            { time: "2026-09-19 18:00:00", site_sessions: [[1, "9"]] },
          ],
  }));
  app = Fastify();
  app.post<{ Params: { organizationId: string }; Querystring: unknown; Body: unknown }>(
    "/organizations/:organizationId/site-cards-lite",
    {
      preHandler: [requireOrgMember({ resource: "analytics", action: "read" })],
    },
    getSiteCardsLite
  );
  app.post<{ Params: { organizationId: string }; Querystring: unknown; Body: unknown }>(
    "/organizations/:organizationId/site-cards",
    { preHandler: [requireOrgMember({ resource: "analytics", action: "read" })] },
    getSiteCards
  );
  await app.ready();
});

afterEach(async () => {
  await app.close();
  vi.restoreAllMocks();
});

describe.each(["site-cards", "site-cards-lite"])("batched %s", endpoint => {
  const url = `/organizations/org-1/${endpoint}?past_minutes_start=1440&past_minutes_end=0&time_zone=America%2FNew_York&bucket=hour`;
  const request = (payload: unknown = { siteIds: allIds, comparison }, requestUrl = url) =>
    app.inject({
      method: "POST",
      url: requestUrl,
      payload: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    });

  it("runs exactly two bounded queries for 20 sites, returning totals and zero-filled sessions", async () => {
    const response = await request();
    expect(response.statusCode).toBe(200);
    const data = response.json().data;
    expect(Object.keys(data)).toHaveLength(20);
    expect(data[1]).toEqual({
      current: { sessions: 12, users: 8 },
      previous: { sessions: 10, users: 7 },
      series: [
        { time: "2026-09-19 16:00:00", sessions: 3 },
        { time: "2026-09-19 17:00:00", sessions: 0 },
        { time: "2026-09-19 18:00:00", sessions: 9 },
      ],
    });
    expect(data[20]).toEqual({
      current: { sessions: 0, users: 0 },
      previous: { sessions: 0, users: 0 },
      series: data[1].series.map((point: { time: string }) => ({ time: point.time, sessions: 0 })),
    });
    expect(mocks.query).toHaveBeenCalledTimes(2);
    for (const [spec] of mocks.query.mock.calls) {
      expect(spec.query_params).toEqual({ siteIds: allIds });
      expect(spec.clickhouse_settings.max_execution_time).toBe(60);
      if (endpoint === "site-cards") {
        expect(spec.query).toContain("FROM events");
        expect(spec.query).not.toContain("_mv_target");
      }
    }
  });

  it("omits the previous period when comparison is off and deduplicates IDs", async () => {
    const response = await request({ siteIds: [1, 1], comparison: null });
    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json().data)).toEqual(["1"]);
    expect(response.json().data[1].previous).toBeNull();
    expect(mocks.query.mock.calls[0][0].query_params.siteIds).toEqual([1]);
    expect(mocks.query.mock.calls[0][0].query).not.toContain("2026-09-18");
  });

  it.each([5, 30, 60, 120])("reads exact events for a %i-minute rolling window", async minutes => {
    const response = await request(
      {
        siteIds: [1, 2],
        comparison: { past_minutes_start: minutes * 2, past_minutes_end: minutes },
      },
      `/organizations/org-1/${endpoint}?past_minutes_start=${minutes}&past_minutes_end=0&bucket=minute`
    );
    expect(response.statusCode).toBe(200);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    for (const [spec] of mocks.query.mock.calls) {
      expect(spec.query).toContain("FROM events");
      expect(spec.query).not.toContain("_mv_target");
    }
    expect(mocks.query.mock.calls[1][0].query).toContain("toStartOfMinute");
  });

  it("also uses exact events when only the comparison is a short rolling window", async () => {
    const response = await request({
      siteIds: [1],
      comparison: { past_minutes_start: 60, past_minutes_end: 30 },
    });
    expect(response.statusCode).toBe(200);
    expect(mocks.query.mock.calls[0][0].query).toContain("FROM events");
  });

  it.each([
    { siteIds: [], comparison },
    { siteIds: [...allIds, 21], comparison },
    { siteIds: [-1], comparison },
    { siteIds: [1.5], comparison },
    { siteIds: ["1) OR 1"], comparison },
    { siteIds: [1] },
    { siteIds: [1], comparison: { start_date: "2026-09-18" } },
    { siteIds: [1], comparison: { past_minutes_start: 60, past_minutes_end: 60 } },
    { siteIds: [1], comparison: { start_date: "2026-09-19", end_date: "2026-09-18" } },
    { siteIds: [1], comparison: { start_datetime: "2026-09-18 10:30:00" } },
    { siteIds: [1], comparison: { start_datetime: "2026-09-18 11:30:00", end_datetime: "2026-09-18 10:30:00" } },
  ])("rejects malformed or unsupported bodies without querying analytics: %j", async body => {
    expect((await request(body)).statusCode).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it.each([
    "past_minutes_start=1440",
    "past_minutes_start=Infinity&past_minutes_end=0",
    "past_minutes_start=&past_minutes_end=",
    "start_date=bad&end_date=bad",
    "time_zone=invalid",
    "bucket=bad",
    "filters=[]",
    "start_datetime=bad&end_datetime=bad",
  ])("rejects invalid current windows or unsupported parameters: %s", async query => {
    const response = await request(undefined, `/organizations/org-1/${endpoint}?${query}`);
    expect(response.statusCode).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("accepts the dashboard's empty date bounds for all-time", async () => {
    const response = await request(
      { siteIds: [1, 20], comparison: null },
      `/organizations/org-1/${endpoint}?start_date=&end_date=&bucket=month`
    );
    expect(response.statusCode).toBe(200);
    expect(response.json().data[1].series).toHaveLength(2);
    expect(response.json().data[20].series).toEqual([]);
  });

  it("rejects a site outside the organization even if the user can access it", async () => {
    mocks.siteIdsInOrganization.mockResolvedValue([1]);
    expect((await request({ siteIds: [1, 2], comparison })).statusCode).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejects sites excluded by member or team access before querying ClickHouse", async () => {
    mocks.getSitesUserHasAccessTo.mockResolvedValue([{ siteId: 1, organizationId: "org-1" }]);
    expect((await request({ siteIds: [1, 2], comparison })).statusCode).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers and keys without analytics:read", async () => {
    mocks.getUserIsInOrg.mockResolvedValue(false);
    mocks.getSessionFromReq.mockResolvedValue(null);
    expect((await request()).statusCode).toBe(403);
    mocks.checkApiKey.mockResolvedValue({ valid: true, userId: "user-1", statements: { org: ["read"] } });
    const denied = await request();
    expect(denied.statusCode).toBe(403);
    expect(denied.json().required).toBe("analytics:read");
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("supports organization-owned analytics keys without a session user", async () => {
    mocks.getUserIsInOrg.mockResolvedValue(false);
    mocks.getSessionFromReq.mockResolvedValue(null);
    mocks.checkApiKey.mockResolvedValue({ valid: true, organizationId: "org-1", statements: { analytics: ["read"] } });
    expect((await request()).statusCode).toBe(200);
    expect(mocks.getSitesUserHasAccessTo.mock.calls[0][0].apiKeyOrganizationId).toBe("org-1");
  });

  it("reports query failures as errors, not zero totals", async () => {
    mocks.query.mockRejectedValue(new Error("ClickHouse unavailable"));
    const response = await request();
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Failed to fetch site cards" });
  });

  it("serves exact datetime windows only from raw events", async () => {
    const response = await request(
      { siteIds: [1], comparison: { start_datetime: "2026-09-17 10:30:00", end_datetime: "2026-09-17 11:30:00" } },
      `/organizations/org-1/${endpoint}?start_datetime=2026-09-18+10:30:00&end_datetime=2026-09-18+11:30:00&bucket=minute`
    );
    expect(response.statusCode).toBe(endpoint === "site-cards" ? 200 : 400);
    if (endpoint === "site-cards") {
      expect(mocks.query.mock.calls[0][0].query).toContain("timestamp >= toDateTime('2026-09-18 10:30:00', 'UTC')");
      expect(mocks.query.mock.calls[0][0].query).toContain("timestamp < toDateTime('2026-09-17 11:30:00', 'UTC')");
      expect(mocks.query.mock.calls[1][0].query).toContain("toStartOfMinute");
    } else {
      expect(mocks.query).not.toHaveBeenCalled();
    }
  });
});
