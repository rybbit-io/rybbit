import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Who gets which weekly email: one per person, the full report when they have one site with
 * traffic and a digest when they have more. Postgres, ClickHouse, site access and the senders
 * are mocked; the routing is the subject under test.
 */
const state = vi.hoisted(() => ({
  memberships: [] as Array<{
    memberId: string;
    userId: string;
    role: string;
    organizationId: string;
    hasRestrictedSiteAccess: boolean;
    email: string;
    sendAutoEmailReports: boolean | null;
  }>,
  organizations: [] as Array<{ id: string; name: string }>,
  sites: [] as Array<{ siteId: number; name: string; domain: string; organizationId: string | null }>,
  /** Pageviews per site in the reported week and the one before. */
  activity: [] as Array<{ site_id: number; current: number; previous: number }>,
  /** userId -> site ids a restricted member can open. */
  grants: new Map<string, number[]>(),
  overviewQueries: [] as number[],
}));

const mocks = vi.hoisted(() => ({
  sendWeeklyReportEmail: vi.fn(),
  sendWeeklyDigestEmail: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => {
  const chain = (rows: () => unknown[]) => {
    const builder: any = {
      from: () => builder,
      innerJoin: () => builder,
      where: () => builder,
      then: (resolve: any, reject: any) => Promise.resolve(rows()).then(resolve, reject),
    };
    return builder;
  };
  return {
    db: {
      // The three reads are told apart by the columns each one selects.
      select: (fields: Record<string, unknown>) =>
        chain(() => {
          if ("memberId" in fields) return state.memberships;
          if ("siteId" in fields) return state.sites;
          return state.organizations;
        }),
    },
  };
});

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: async (request: { query: string; query_params: { siteId?: number } }) => request },
}));

vi.mock("../../api/analytics/utils/utils.js", () => ({
  processResults: async ({ query, query_params }: { query: string; query_params: { siteId?: number } }) => {
    if (query.includes("{currentStart:String}")) return state.activity;
    if (query.includes("max(timestamp) AS last")) return [{ last: "2026-10-11 23:41:00" }];
    if (query.includes("FilteredSessionsWithStats")) {
      state.overviewQueries.push(query_params.siteId!);
      const site = state.activity.find(row => row.site_id === query_params.siteId);
      return [
        {
          sessions: 10,
          pageviews: site?.current ?? 0,
          users: 7,
          pages_per_session: 2,
          bounce_rate: 40,
          session_duration: 60,
        },
      ];
    }
    return [];
  },
}));

vi.mock("../../lib/access.js", () => ({
  filterSitesByMemberAccess: async (orgSites: Array<{ siteId: number }>, _org: string, userId: string) =>
    orgSites.filter(site => state.grants.get(userId)?.includes(site.siteId)),
}));

vi.mock("../../lib/email/email.js", () => ({
  sendWeeklyReportEmail: mocks.sendWeeklyReportEmail,
  sendWeeklyDigestEmail: mocks.sendWeeklyDigestEmail,
}));

vi.mock("../../lib/const.js", async importOriginal => ({
  ...(await importOriginal<typeof import("../../lib/const.js")>()),
  IS_CLOUD: true,
}));

vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { weeklyReportService } from "./weeklyReportService.js";

const membership = (userId: string, organizationId: string, role = "owner", overrides = {}) => ({
  memberId: `m_${userId}_${organizationId}`,
  userId,
  role,
  organizationId,
  hasRestrictedSiteAccess: false,
  email: `${userId}@example.com`,
  sendAutoEmailReports: true,
  ...overrides,
});

const site = (siteId: number, organizationId: string) => ({
  siteId,
  name: `Site ${siteId}`,
  domain: `site${siteId}.com`,
  organizationId,
});

const digestRecipients = () =>
  mocks.sendWeeklyDigestEmail.mock.calls.map(([args]) => ({
    email: args.email,
    sites: args.digest.sites.map((s: { siteId: number }) => s.siteId).sort(),
  }));

beforeEach(() => {
  state.organizations = [
    { id: "org_a", name: "Acme" },
    { id: "org_b", name: "Side Project" },
  ];
  state.sites = [site(1, "org_a"), site(2, "org_a"), site(3, "org_a"), site(4, "org_b")];
  state.activity = [];
  state.memberships = [];
  state.grants.clear();
  state.overviewQueries = [];
  mocks.sendWeeklyReportEmail.mockReset();
  mocks.sendWeeklyDigestEmail.mockReset();
});

describe("weekly reports", () => {
  it("sends the full report to someone with one site that had traffic", async () => {
    state.memberships = [membership("ada", "org_a")];
    state.activity = [{ site_id: 1, current: 50, previous: 40 }];

    await weeklyReportService.generateAndSendReports();

    expect(mocks.sendWeeklyDigestEmail).not.toHaveBeenCalled();
    expect(mocks.sendWeeklyReportEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendWeeklyReportEmail.mock.calls[0][0]).toMatchObject({
      email: "ada@example.com",
      site: { siteId: 1, siteDomain: "site1.com" },
    });
  });

  it("sends one digest across every organization instead of one email per site", async () => {
    state.memberships = [membership("ada", "org_a"), membership("ada", "org_b")];
    state.activity = [
      { site_id: 1, current: 50, previous: 40 },
      { site_id: 2, current: 5, previous: 0 },
      { site_id: 4, current: 9, previous: 9 },
    ];

    await weeklyReportService.generateAndSendReports();

    expect(mocks.sendWeeklyReportEmail).not.toHaveBeenCalled();
    expect(digestRecipients()).toEqual([{ email: "ada@example.com", sites: [1, 2, 4] }]);
  });

  it("lists a site that went quiet next to the busy ones, but never mails about quiet sites alone", async () => {
    state.memberships = [membership("ada", "org_a"), membership("bob", "org_b")];
    state.activity = [
      { site_id: 1, current: 50, previous: 40 },
      { site_id: 3, current: 0, previous: 30 },
      { site_id: 4, current: 0, previous: 12 },
    ];

    await weeklyReportService.generateAndSendReports();

    expect(digestRecipients()).toEqual([{ email: "ada@example.com", sites: [1, 3] }]);
    const quiet = mocks.sendWeeklyDigestEmail.mock.calls[0][0].digest.sites.find(
      (s: { siteId: number }) => s.siteId === 3
    );
    expect(quiet).toMatchObject({ users: 0, lastPageviewAt: "2026-10-11T23:41:00.000Z" });
    expect(mocks.sendWeeklyReportEmail).not.toHaveBeenCalled();
  });

  it("only reports on sites a restricted member can open, and skips people who turned reports off", async () => {
    state.memberships = [
      membership("ada", "org_a", "member", { hasRestrictedSiteAccess: true }),
      membership("off", "org_a", "owner", { sendAutoEmailReports: false }),
    ];
    state.grants.set("ada", [2]);
    state.activity = [
      { site_id: 1, current: 50, previous: 40 },
      { site_id: 2, current: 5, previous: 3 },
    ];

    await weeklyReportService.generateAndSendReports();

    expect(mocks.sendWeeklyDigestEmail).not.toHaveBeenCalled();
    expect(mocks.sendWeeklyReportEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendWeeklyReportEmail.mock.calls[0][0]).toMatchObject({
      email: "ada@example.com",
      site: { siteId: 2 },
    });
  });

  it("queries a site shared by several people once per run", async () => {
    state.memberships = [membership("ada", "org_a"), membership("bob", "org_a", "admin")];
    state.activity = [
      { site_id: 1, current: 50, previous: 40 },
      { site_id: 2, current: 5, previous: 3 },
    ];

    await weeklyReportService.generateAndSendReports();

    expect(digestRecipients()).toHaveLength(2);
    // Two overview queries (this week and last) per site, not per recipient.
    expect(state.overviewQueries.sort()).toEqual([1, 1, 2, 2]);
  });
});
