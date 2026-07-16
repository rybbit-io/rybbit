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
  dbMock.select.mockReset();
  (siteConfig as unknown as { cache: Map<string, unknown> }).cache.clear();

  dbMock.select.mockImplementation(() => ({
    from: () => ({
      where: (condition: DrizzleCondition) => ({
        limit: async () => {
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
});

describe("siteConfig exclusion matchers", () => {
  it("matches excluded paths with glob wildcards, case-insensitively", async () => {
    dbMock.rows.push(createSiteRow({ siteId: 1, excludedPaths: ["/admin/*", "/preview"] }));

    expect(await siteConfig.isPathExcluded("/admin/users", 1)).toBe(true);
    expect(await siteConfig.isPathExcluded("/ADMIN/users", 1)).toBe(true);
    expect(await siteConfig.isPathExcluded("/preview", 1)).toBe(true);
    expect(await siteConfig.isPathExcluded("/admin", 1)).toBe(false); // no trailing segment
    expect(await siteConfig.isPathExcluded("/blog", 1)).toBe(false);
    expect(await siteConfig.isPathExcluded(undefined, 1)).toBe(false);
  });

  it("matches patterns with multiple and consecutive wildcards, bounded against backtracking", async () => {
    dbMock.rows.push(
      createSiteRow({ siteId: 5, excludedPaths: ["/a/*/b/*", "/x**y"] }),
      createSiteRow({ siteId: 6, excludedPaths: ["/" + "*a".repeat(30) + "b"] })
    );

    expect(await siteConfig.isPathExcluded("/a/1/b/2", 5)).toBe(true);
    expect(await siteConfig.isPathExcluded("/a//b/", 5)).toBe(true); // wildcards may match empty
    expect(await siteConfig.isPathExcluded("/a/1/c/2", 5)).toBe(false);
    expect(await siteConfig.isPathExcluded("/xANYTHINGy", 5)).toBe(true); // consecutive wildcards

    // A pathological pattern must still resolve promptly (no catastrophic backtracking).
    expect(await siteConfig.isPathExcluded("/" + "a".repeat(2000), 6)).toBe(false);
  });

  it("matches excluded hostnames with glob wildcards", async () => {
    dbMock.rows.push(createSiteRow({ siteId: 2, excludedHostnames: ["localhost", "*.vercel.app"] }));

    expect(await siteConfig.isHostnameExcluded("localhost", 2)).toBe(true);
    expect(await siteConfig.isHostnameExcluded("my-app.vercel.app", 2)).toBe(true);
    expect(await siteConfig.isHostnameExcluded("vercel.app", 2)).toBe(false);
    expect(await siteConfig.isHostnameExcluded("example.com", 2)).toBe(false);
  });

  it("matches excluded user agents as case-insensitive substrings", async () => {
    dbMock.rows.push(createSiteRow({ siteId: 3, excludedUserAgents: ["HeadlessChrome", "MyMonitor"] }));

    expect(await siteConfig.isUserAgentExcluded("Mozilla/5.0 HeadlessChrome/120", 3)).toBe(true);
    expect(await siteConfig.isUserAgentExcluded("mozilla/5.0 headlesschrome/120", 3)).toBe(true);
    expect(await siteConfig.isUserAgentExcluded("Mozilla/5.0 (real browser)", 3)).toBe(false);
    expect(await siteConfig.isUserAgentExcluded(undefined, 3)).toBe(false);
  });

  it("returns false when no exclusions are configured", async () => {
    dbMock.rows.push(createSiteRow({ siteId: 4 }));

    expect(await siteConfig.isPathExcluded("/admin", 4)).toBe(false);
    expect(await siteConfig.isHostnameExcluded("localhost", 4)).toBe(false);
    expect(await siteConfig.isUserAgentExcluded("HeadlessChrome", 4)).toBe(false);
  });
});
