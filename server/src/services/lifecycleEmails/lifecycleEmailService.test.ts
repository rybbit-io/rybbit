import { DateTime } from "luxon";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The lifecycle cron is a state machine: every email is triggered by a state
 * transition or a timeout inside a state, never by a timer from signup. These
 * tests drive the machine through its states with mocked Postgres/ClickHouse
 * and assert which single email (if any) each evaluation produces.
 */

const now = () => DateTime.utc();
const hoursAgo = (h: number) => now().minus({ hours: h }).toSQL({ includeOffset: false })!;
const daysAgo = (d: number) => now().minus({ days: d }).toSQL({ includeOffset: false })!;

const state = vi.hoisted(() => ({
  users: [] as Array<{ id: string; email: string; name: string; createdAt: string }>,
  memberships: [] as Array<{ userId: string; organizationId: string; role: string }>,
  sites: [] as Array<{
    siteId: number;
    domain: string;
    createdAt: string;
    organizationId: string;
    detectedPlatform: string | null;
  }>,
  logs: [] as Array<{ userId: string; emailKey: string; sentAt: string }>,
  goals: [] as Array<{ siteId: number }>,
  owners: [] as Array<{ organizationId: string; userId: string; email: string; name: string }>,
  /** site_id -> aggregate stats returned by the ClickHouse batch query */
  siteStats: [] as Array<{ site_id: number; first_event: string; last_event: string; total: number; custom_events: number }>,
  firstPageview: [] as Array<{ country: string }>,
  overview: [] as Array<{ sessions: number; pageviews: number }>,
  topRows: [] as Array<{ value: string }>,
  convertingPaths: [] as Array<{ pathname: string }>,
  quietSites: [] as Array<{ site_id: number; last_event: string; total: number }>,
  /** unique-key guard mirroring the DB constraint */
  sentKeys: new Set<string>(),
}));

const mocks = vi.hoisted(() => ({
  sendLifecycleEmail: vi.fn(async (_email: string, _subject: string, _text: string) => true),
  isContactUnsubscribed: vi.fn(async (_email: string) => false),
  detectPlatform: vi.fn(async () => null),
}));

vi.mock("../../db/postgres/postgres.js", () => {
  function chain(rows: () => unknown[]) {
    const builder: any = {
      from: () => builder,
      innerJoin: () => builder,
      where: () => builder,
      then: (resolve: any, reject: any) => Promise.resolve(rows()).then(resolve, reject),
    };
    return builder;
  }

  return {
    db: {
      // Reads are told apart by the columns each one selects.
      select: (fields: Record<string, unknown>) =>
        chain(() => {
          if ("emailKey" in fields) return state.logs;
          if ("role" in fields) return state.memberships;
          if ("createdAt" in fields && "email" in fields) return state.users;
          if ("detectedPlatform" in fields) return state.sites;
          if ("email" in fields && "organizationId" in fields) return state.owners;
          if ("domain" in fields) return state.sites;
          return state.goals;
        }),
      insert: () => ({
        values: (row: { userId: string; emailKey: string }) => ({
          onConflictDoNothing: () => ({
            returning: async () => {
              const key = `${row.userId}:${row.emailKey}`;
              if (state.sentKeys.has(key)) return [];
              state.sentKeys.add(key);
              return [{ id: state.sentKeys.size }];
            },
          }),
        }),
      }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
      delete: () => ({ where: async () => undefined }),
    },
  };
});

vi.mock("../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: {
    query: async ({ query }: { query: string }) => {
      const rows = (() => {
        if (query.includes("custom_events")) return state.siteStats;
        if (query.includes("ORDER BY timestamp ASC")) return state.firstPageview;
        if (query.includes("uniq(session_id)")) return state.overview;
        if (query.includes("GROUP BY value")) return state.topRows;
        if (query.includes("INTERVAL 14 DAY")) return state.convertingPaths;
        if (query.includes("INTERVAL 90 DAY")) return state.quietSites;
        return [];
      })();
      return { json: async () => rows };
    },
  },
}));

vi.mock("../../lib/email/email.js", () => ({
  sendLifecycleEmail: mocks.sendLifecycleEmail,
  isContactUnsubscribed: mocks.isContactUnsubscribed,
}));

vi.mock("../../lib/const.js", () => ({ IS_CLOUD: true, SECRET: "test-secret" }));

vi.mock("./platformDetect.js", async importOriginal => {
  const original = await importOriginal<typeof import("./platformDetect.js")>();
  return { ...original, detectPlatform: mocks.detectPlatform };
});

import { lifecycleEmailService } from "./lifecycleEmailService.js";

const run = () => lifecycleEmailService.processLifecycleEmails();
const sentSubjects = () => mocks.sendLifecycleEmail.mock.calls.map(call => call[1]);

const addUser = (id: string, createdAt: string) => {
  state.users.push({ id, email: `${id}@example.com`, name: "Ada", createdAt });
};
const addOwnedSite = (userId: string, siteId: number, domain: string, createdAt: string) => {
  const orgId = `org-${userId}`;
  if (!state.memberships.some(m => m.userId === userId && m.organizationId === orgId)) {
    state.memberships.push({ userId, organizationId: orgId, role: "owner" });
  }
  state.sites.push({ siteId, domain, createdAt, organizationId: orgId, detectedPlatform: null });
};

beforeEach(() => {
  process.env.BASE_URL = "https://app.rybbit.io";
  for (const value of Object.values(state)) {
    if (Array.isArray(value)) value.length = 0;
    else if (value instanceof Set) value.clear();
  }
  vi.clearAllMocks();
  mocks.sendLifecycleEmail.mockResolvedValue(true);
  mocks.isContactUnsubscribed.mockResolvedValue(false);
});

describe("state: signed up, no site", () => {
  it("sends the finish-setup email once the 2h timeout passes", async () => {
    addUser("u1", hoursAgo(3));
    await run();
    expect(sentSubjects()).toEqual(["Finish setting up Rybbit"]);
  });

  it("sends nothing before the timeout", async () => {
    addUser("u1", hoursAgo(1));
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("never sends the same email twice", async () => {
    addUser("u1", hoursAgo(3));
    await run();
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
  });

  it("escalates to the reply-based ask after 3 days, then stops", async () => {
    addUser("u1", daysAgo(4));
    state.logs.push({ userId: "u1", emailKey: "no_site_1", sentAt: daysAgo(3) });
    state.sentKeys.add("u1:no_site_1");
    await run();
    expect(sentSubjects()).toEqual(["Was something unclear?"]);
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
  });

  it("skips invited teammates who own no organization", async () => {
    addUser("u1", hoursAgo(5));
    state.memberships.push({ userId: "u1", organizationId: "someone-elses-org", role: "member" });
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("skips unsubscribed users entirely", async () => {
    addUser("u1", hoursAgo(3));
    mocks.isContactUnsubscribed.mockResolvedValue(true);
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });
});

describe("state: site created, no data", () => {
  it("sends the snippet email an hour after site creation", async () => {
    addUser("u1", hoursAgo(4));
    addOwnedSite("u1", 42, "acme.com", hoursAgo(2));
    await run();
    expect(sentSubjects()).toEqual(["One step left for acme.com"]);
    const body = mocks.sendLifecycleEmail.mock.calls[0][2];
    expect(body).toContain('data-site-id="42"');
  });

  it("follows up with the live install check after 24h of silence", async () => {
    addUser("u1", daysAgo(2));
    addOwnedSite("u1", 42, "acme.com", hoursAgo(26));
    state.logs.push({ userId: "u1", emailKey: "install_snippet:42", sentAt: hoursAgo(25) });
    state.sentKeys.add("u1:install_snippet:42");
    await run();
    expect(sentSubjects()).toEqual(["Still nothing from acme.com"]);
    const body = mocks.sendLifecycleEmail.mock.calls[0][2];
    expect(body).toContain("/api/site/check-install?domain=acme.com&sig=");
  });

  it("sends the final reply-based email at day 5 and nothing after", async () => {
    addUser("u1", daysAgo(7));
    addOwnedSite("u1", 42, "acme.com", daysAgo(6));
    state.logs.push({ userId: "u1", emailKey: "install_snippet:42", sentAt: daysAgo(6) });
    state.logs.push({ userId: "u1", emailKey: "install_check:42", sentAt: daysAgo(5) });
    state.sentKeys.add("u1:install_snippet:42");
    state.sentKeys.add("u1:install_check:42");
    await run();
    expect(sentSubjects()).toEqual(["Need a hand with acme.com?"]);
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
  });
});

describe("transition: first data arrives", () => {
  it("sends 'you're live' immediately, bypassing the educational gap", async () => {
    addUser("u1", daysAgo(1));
    addOwnedSite("u1", 42, "acme.com", hoursAgo(20));
    // snippet email went out an hour ago - the gap must not delay the transition email
    state.logs.push({ userId: "u1", emailKey: "install_snippet:42", sentAt: hoursAgo(1) });
    state.sentKeys.add("u1:install_snippet:42");
    state.siteStats.push({ site_id: 42, first_event: hoursAgo(1), last_event: hoursAgo(1), total: 5, custom_events: 0 });
    state.firstPageview.push({ country: "DE" });
    await run();
    expect(sentSubjects()).toEqual(["Rybbit is live on acme.com"]);
    const body = mocks.sendLifecycleEmail.mock.calls[0][2];
    expect(body).toContain("Germany");
  });

  it("does not send it for sites whose first event is old (pre-existing traffic)", async () => {
    addUser("u1", daysAgo(20));
    addOwnedSite("u1", 42, "acme.com", daysAgo(20));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(15), last_event: hoursAgo(1), total: 900, custom_events: 3 });
    await run();
    expect(sentSubjects()).not.toContain("Rybbit is live on acme.com");
  });
});

describe("state: data flowing", () => {
  it("sends the first-days report keyed to data age, with real numbers", async () => {
    addUser("u1", daysAgo(10));
    addOwnedSite("u1", 42, "acme.com", daysAgo(10));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(4), last_event: hoursAgo(2), total: 500, custom_events: 0 });
    state.sentKeys.add("u1:site_live:42");
    state.logs.push({ userId: "u1", emailKey: "site_live:42", sentAt: daysAgo(4) });
    state.overview.push({ sessions: 120, pageviews: 340 });
    state.topRows.push({ value: "google.com" });
    await run();
    expect(sentSubjects()).toEqual(["Your first days of data on acme.com"]);
    const body = mocks.sendLifecycleEmail.mock.calls[0][2];
    expect(body).toContain("120 visits");
    expect(body).toContain("google.com");
  });

  it("holds educational emails until the 48h gap has passed", async () => {
    addUser("u1", daysAgo(10));
    addOwnedSite("u1", 42, "acme.com", daysAgo(10));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(4), last_event: hoursAgo(2), total: 500, custom_events: 0 });
    state.sentKeys.add("u1:site_live:42");
    state.logs.push({ userId: "u1", emailKey: "site_live:42", sentAt: hoursAgo(10) });
    await run();
    expect(mocks.sendLifecycleEmail).not.toHaveBeenCalled();
  });

  it("nudges goals only when the data shows a converting path and no goal exists", async () => {
    addUser("u1", daysAgo(15));
    addOwnedSite("u1", 42, "acme.com", daysAgo(15));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(8), last_event: hoursAgo(2), total: 2000, custom_events: 4 });
    for (const key of ["site_live:42", "first_days:42"]) {
      state.sentKeys.add(`u1:${key}`);
      state.logs.push({ userId: "u1", emailKey: key, sentAt: daysAgo(4) });
    }
    state.convertingPaths.push({ pathname: "/thank-you" });
    await run();
    expect(sentSubjects()).toEqual(["Visitors are reaching /thank-you - measure it"]);

    // With a goal already configured, the nudge never fires
    state.sentKeys.delete("u1:nudge_goals:42");
    mocks.sendLifecycleEmail.mockClear();
    state.goals.push({ siteId: 42 });
    await run();
    expect(sentSubjects()).not.toContain("Visitors are reaching /thank-you - measure it");
  });

  it("nudges custom events only when the site has none", async () => {
    addUser("u1", daysAgo(20));
    addOwnedSite("u1", 42, "acme.com", daysAgo(20));
    state.siteStats.push({ site_id: 42, first_event: daysAgo(11), last_event: hoursAgo(2), total: 2000, custom_events: 0 });
    for (const key of ["site_live:42", "first_days:42"]) {
      state.sentKeys.add(`u1:${key}`);
      state.logs.push({ userId: "u1", emailKey: key, sentAt: daysAgo(5) });
    }
    await run();
    expect(sentSubjects()).toEqual(["See what visitors actually do on acme.com"]);
  });
});

describe("state: went quiet", () => {
  it("alerts the owner when an established site stops sending data", async () => {
    state.quietSites.push({ site_id: 7, last_event: hoursAgo(50), total: 5000 });
    state.sites.push({ siteId: 7, domain: "quiet.com", createdAt: daysAgo(200), organizationId: "org-x", detectedPlatform: null });
    state.owners.push({ organizationId: "org-x", userId: "owner1", email: "owner1@example.com", name: "Ada" });
    await run();
    expect(sentSubjects()).toEqual(["We stopped hearing from quiet.com"]);
    await run();
    expect(mocks.sendLifecycleEmail).toHaveBeenCalledTimes(1);
  });
});
