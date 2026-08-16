import { beforeEach, describe, expect, it, vi } from "vitest";
import { siteConfig } from "./siteConfig.js";

type SiteRow = {
  id: string | null;
  siteId: number;
  public: boolean | null;
  embedEnabled: boolean | null;
  saltUserIds: boolean | null;
  domain: string | null;
  blockBots: boolean;
  excludedIPs: unknown;
  excludedCountries: unknown;
  excludedPaths: unknown;
  excludedHostnames: unknown;
  excludedUserAgents: unknown;
  privateLinkKey: string | null;
  sessionReplay: boolean | null;
  webVitals: boolean | null;
  trackErrors: boolean | null;
  trackOutbound: boolean | null;
  trackUrlParams: boolean | null;
  trackInitialPageView: boolean | null;
  trackSpaNavigation: boolean | null;
  trackIp: boolean | null;
  trackButtonClicks: boolean | null;
  trackCopy: boolean | null;
  trackFormInteractions: boolean | null;
  tags: unknown;
};

type DrizzleCondition = {
  queryChunks?: Array<{
    name?: string;
    value?: unknown;
  }>;
};

const dbMock = vi.hoisted(() => ({
  rows: [] as SiteRow[],
  queries: [] as Array<{ column: string | undefined; value: unknown }>,
  failure: null as Error | null,
  select: vi.fn(),
}));

vi.mock("../db/postgres/postgres.js", () => ({
  db: {
    select: dbMock.select,
  },
}));

function createSiteRow(overrides: Partial<SiteRow>): SiteRow {
  return {
    id: "abcdef123456",
    siteId: 123,
    public: false,
    embedEnabled: false,
    saltUserIds: false,
    domain: "example.com",
    blockBots: true,
    excludedIPs: [],
    excludedCountries: [],
    excludedPaths: [],
    excludedHostnames: [],
    excludedUserAgents: [],
    privateLinkKey: null,
    sessionReplay: false,
    webVitals: false,
    trackErrors: false,
    trackOutbound: true,
    trackUrlParams: true,
    trackInitialPageView: true,
    trackSpaNavigation: true,
    trackIp: false,
    trackButtonClicks: false,
    trackCopy: false,
    trackFormInteractions: false,
    tags: [],
    ...overrides,
  };
}

function getCache() {
  return (siteConfig as unknown as { cache: Map<string, { data: unknown; expires: number }> }).cache;
}

function getConditionDetails(condition: DrizzleCondition): { column: string | undefined; value: unknown } {
  const column = condition.queryChunks?.find(chunk => chunk.name === "id" || chunk.name === "site_id")?.name;
  const value = condition.queryChunks?.find(
    chunk => Object.prototype.hasOwnProperty.call(chunk, "value") && !Array.isArray(chunk.value)
  )?.value;

  return { column, value };
}

beforeEach(() => {
  dbMock.rows.length = 0;
  dbMock.queries.length = 0;
  dbMock.failure = null;
  dbMock.select.mockReset();
  getCache().clear();

  dbMock.select.mockImplementation(() => ({
    from: () => ({
      where: (condition: DrizzleCondition) => ({
        limit: async () => {
          if (dbMock.failure) throw dbMock.failure;

          const query = getConditionDetails(condition);
          dbMock.queries.push(query);

          const row = dbMock.rows.find(site => {
            if (query.column === "id") {
              return site.id === query.value;
            }

            if (query.column === "site_id") {
              return site.siteId === query.value;
            }

            return false;
          });

          return row ? [row] : [];
        },
      }),
    }),
  }));
});

describe("siteConfig.getConfig", () => {
  it("resolves digit-only string site IDs by exact sites.id before legacy site_id fallback", async () => {
    dbMock.rows.push(
      createSiteRow({
        id: "123456789012",
        siteId: 42,
        domain: "numeric-text-id.example",
      })
    );

    const config = await siteConfig.getConfig("123456789012");

    expect(config?.siteId).toBe(42);
    expect(config?.id).toBe("123456789012");
    expect(dbMock.queries).toEqual([{ column: "id", value: "123456789012" }]);
  });

  it("falls back to legacy numeric site_id when a numeric string has no exact sites.id match", async () => {
    dbMock.rows.push(
      createSiteRow({
        id: "abcdef123456",
        siteId: 21,
        domain: "legacy-id.example",
      })
    );

    const config = await siteConfig.getConfig("21");

    expect(config?.siteId).toBe(21);
    expect(config?.id).toBe("abcdef123456");
    expect(dbMock.queries).toEqual([
      { column: "id", value: "21" },
      { column: "site_id", value: 21 },
    ]);
  });

  it("keeps numeric and string cache keys separate", async () => {
    dbMock.rows.push(
      createSiteRow({
        id: "123",
        siteId: 99,
      }),
      createSiteRow({
        id: "abcdef123456",
        siteId: 123,
      })
    );

    const exactTextConfig = await siteConfig.getConfig("123");
    const legacyConfig = await siteConfig.getConfig(123);

    expect(exactTextConfig?.siteId).toBe(99);
    expect(legacyConfig?.siteId).toBe(123);
    expect(dbMock.queries).toEqual([
      { column: "id", value: "123" },
      { column: "site_id", value: 123 },
    ]);
  });

  it("applies the blockBots default a direct column read would miss", async () => {
    dbMock.rows.push(createSiteRow({ siteId: 123, blockBots: undefined as unknown as boolean }));

    expect((await siteConfig.getConfig(123))?.blockBots).toBe(true);
  });

  // Ingestion reads this per event and must degrade to "no configuration"
  // rather than throw out of the tracking handler.
  it("swallows a Postgres failure", async () => {
    dbMock.failure = new Error("postgres is down");

    expect(await siteConfig.getConfig(123)).toBeUndefined();
  });

  // Route guards resolve whatever the caller put in the URL, before auth, and a
  // digit-only string falls back to site_id — so every zero-padded rendering of
  // one site's number resolves that site under its own cache key.
  it("caches zero-padded identifier variants separately", async () => {
    dbMock.rows.push(createSiteRow({ id: "abcdef123456", siteId: 123 }));
    const cache = getCache();

    for (const identifier of ["123", "0123", "00123", "000123"]) {
      expect((await siteConfig.getConfig(identifier))?.siteId).toBe(123);
    }

    expect(cache.size).toBe(4);
  });

  it("bounds the cache so those variants cannot grow it without limit", async () => {
    dbMock.rows.push(createSiteRow({ id: "abcdef123456", siteId: 123 }));
    const cache = getCache();

    // Stand in for a cache already full of resolved variants, none expired.
    for (let i = 0; i < 10_000; i++) {
      cache.set(`string:variant-${i}`, { data: {} as never, expires: Date.now() + 60_000 });
    }

    expect((await siteConfig.getConfig("0000123"))?.siteId).toBe(123);

    expect(cache.size).toBeLessThanOrEqual(10_000);
    expect(cache.has("string:0000123")).toBe(true);
  });

  it("invalidates every spelling for one site without evicting other sites", async () => {
    dbMock.rows.push(
      createSiteRow({ id: "abcdef123456", siteId: 123, domain: "before.example" }),
      createSiteRow({ id: "fedcba654321", siteId: 456, domain: "other.example" })
    );

    // "00123" is the spelling an enumerated cache key would take — matching on
    // the row's identity rather than the identifier is what catches it.
    const spellings: Array<string | number> = [123, "123", "00123", "abcdef123456"];
    for (const spelling of spellings) {
      await siteConfig.getConfig(spelling);
    }
    await siteConfig.getConfig(456);
    const queriesBeforeInvalidation = dbMock.queries.length;

    dbMock.rows[0].domain = "after.example";
    siteConfig.invalidate({ id: "abcdef123456", siteId: 123 });

    for (const spelling of spellings) {
      expect((await siteConfig.getConfig(spelling))?.domain).toBe("after.example");
    }

    // The other Site is untouched, and still costs nothing to read.
    const queriesAfterRewarming = dbMock.queries.length;
    expect(queriesAfterRewarming).toBeGreaterThan(queriesBeforeInvalidation);
    expect((await siteConfig.getConfig(456))?.domain).toBe("other.example");
    expect(dbMock.queries).toHaveLength(queriesAfterRewarming);
  });
});

describe("siteConfig.reload", () => {
  it("reads past a warm cache entry and re-seats every identifier for the site", async () => {
    dbMock.rows.push(createSiteRow({ id: "abcdef123456", siteId: 123, domain: "before.example" }));

    await siteConfig.getConfig(123);
    await siteConfig.getConfig("abcdef123456");

    // A sibling cluster worker served the write, so this process is still warm
    // on the pre-write row.
    dbMock.rows[0].domain = "after.example";

    expect((await siteConfig.reload(123))?.domain).toBe("after.example");
    // Both identifiers now serve the fresh row without another query.
    const queriesAfterReload = dbMock.queries.length;
    expect((await siteConfig.getConfig(123))?.domain).toBe("after.example");
    expect((await siteConfig.getConfig("abcdef123456"))?.domain).toBe("after.example");
    expect(dbMock.queries).toHaveLength(queriesAfterReload);
  });

  it("evicts every spelling the site answered to when it is gone", async () => {
    dbMock.rows.push(createSiteRow({ id: "abcdef123456", siteId: 123 }));

    const spellings: Array<string | number> = [123, "123", "00123", "abcdef123456"];
    for (const spelling of spellings) {
      await siteConfig.getConfig(spelling);
    }

    // Another cluster worker deleted the Site.
    dbMock.rows.length = 0;

    expect(await siteConfig.reload(123)).toBeUndefined();
    for (const spelling of spellings) {
      expect(await siteConfig.getConfig(spelling)).toBeUndefined();
    }
  });

  // A settings screen must be able to tell "no such Site" (404) from "could not
  // ask Postgres" (500), so unlike getConfig this does not swallow.
  it("propagates a Postgres failure", async () => {
    dbMock.failure = new Error("postgres is down");

    await expect(siteConfig.reload(123)).rejects.toThrow("postgres is down");
  });
});

describe("siteConfig.resolveSiteId", () => {
  it("resolves a text id to the numeric site id", async () => {
    dbMock.rows.push(createSiteRow({ id: "abcdef123456", siteId: 123 }));

    expect(await siteConfig.resolveSiteId("abcdef123456")).toBe(123);
  });

  it("returns null for an identifier no site matches", async () => {
    expect(await siteConfig.resolveSiteId("abcdef123456")).toBeNull();
  });

  it("shares the configuration cache rather than keeping its own table", async () => {
    dbMock.rows.push(createSiteRow({ id: "abcdef123456", siteId: 123 }));

    await siteConfig.resolveSiteId("abcdef123456");
    const queriesAfterResolve = dbMock.queries.length;

    expect((await siteConfig.getConfig("abcdef123456"))?.siteId).toBe(123);
    expect(dbMock.queries).toHaveLength(queriesAfterResolve);
  });
});
