import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getConfig: vi.fn(), reload: vi.fn() }));
vi.mock("./siteConfig.js", () => ({ siteConfig: mocks }));
vi.mock("./auth.js", () => ({ auth: { api: { getSession: vi.fn(async () => null) } } }));
vi.mock("./apiRateLimitPolicy.js", () => ({ consumeRateLimitForIdentity: vi.fn() }));
vi.mock("../db/postgres/postgres.js", () => ({ db: {} }));
import { getUserHasAccessToSitePublic } from "./auth-utils.js";

beforeEach(() => vi.resetAllMocks());
const request = () => ({ headers: { "x-private-key": "aaaaaaaaaaaa" } }) as any;
describe("private-link revocation across workers", () => {
  it("rejects a revoked key even if this worker still caches it", async () => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false });
    mocks.reload.mockResolvedValue({ siteId: 7, privateLinkKey: null, public: false });
    expect(await getUserHasAccessToSitePublic(request(), 7)).toBe(false);
  });
  it("accepts a key that is still present in Postgres", async () => {
    const config = { siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false };
    mocks.getConfig.mockResolvedValue(config);
    mocks.reload.mockResolvedValue(config);
    expect(await getUserHasAccessToSitePublic(request(), 7)).toBe(true);
  });
  it("rejects a deleted site while its key is cached", async () => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false });
    mocks.reload.mockResolvedValue(undefined);
    expect(await getUserHasAccessToSitePublic(request(), 7)).toBe(false);
  });
});
