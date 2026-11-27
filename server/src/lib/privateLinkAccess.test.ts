import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getConfig: vi.fn(), reload: vi.fn() }));
vi.mock("./siteConfig.js", () => ({ siteConfig: mocks }));
vi.mock("./auth.js", () => ({ auth: { api: { getSession: vi.fn(async () => null) } } }));
vi.mock("./apiRateLimitPolicy.js", () => ({ consumeRateLimitForIdentity: vi.fn() }));
vi.mock("../db/postgres/postgres.js", () => ({ db: {} }));
import { getSiteIsPubliclyReadable } from "./auth-utils.js";

beforeEach(() => vi.resetAllMocks());
const request = () => ({ headers: { "x-private-key": "aaaaaaaaaaaa" } }) as any;
describe("private-link revocation across workers", () => {
  it("rejects a revoked key even if this worker still caches it", async () => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false });
    mocks.reload.mockResolvedValue({ siteId: 7, privateLinkKey: null, public: false });
    expect(await getSiteIsPubliclyReadable(request(), 7)).toBe(false);
  });
  it("accepts a key that is still present in Postgres", async () => {
    const config = { siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false };
    mocks.getConfig.mockResolvedValue(config);
    mocks.reload.mockResolvedValue(config);
    expect(await getSiteIsPubliclyReadable(request(), 7)).toBe(true);
  });
  it("rejects a deleted site while its key is cached", async () => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false });
    mocks.reload.mockResolvedValue(undefined);
    expect(await getSiteIsPubliclyReadable(request(), 7)).toBe(false);
  });
  it.each([
    ["one character off", "aaaaaaaaaaab"],
    ["same length, different first character", "baaaaaaaaaaa"],
    ["shorter", "aaaaaaaaaaa"],
    ["longer", "aaaaaaaaaaaa0"],
    ["a different case", "AAAAAAAAAAAA"],
  ])("rejects a wrong key (%s) without reloading", async (_name, key) => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false });
    const req = { headers: { "x-private-key": key } } as any;
    expect(await getSiteIsPubliclyReadable(req, 7)).toBe(false);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it("rejects a key that only differs after the revalidating reload", async () => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false });
    mocks.reload.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaab", public: false });
    expect(await getSiteIsPubliclyReadable(request(), 7)).toBe(false);
  });

  it.each([null, undefined, ""])("rejects every key when the site has none (%j)", async stored => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: stored, public: false });
    expect(await getSiteIsPubliclyReadable(request(), 7)).toBe(false);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it("rejects a missing, empty or non-string header", async () => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: "aaaaaaaaaaaa", public: false });
    for (const header of [undefined, "", ["aaaaaaaaaaaa"]]) {
      const req = { headers: { "x-private-key": header } } as any;
      expect(await getSiteIsPubliclyReadable(req, 7)).toBe(false);
    }
  });

  it("does not equate different lone surrogates, which UTF-8 would both turn into U+FFFD", async () => {
    mocks.getConfig.mockResolvedValue({ siteId: 7, privateLinkKey: "\ud800aaaaaaaaaaa", public: false });
    const req = { headers: { "x-private-key": "\ud801aaaaaaaaaaa" } } as any;
    expect(await getSiteIsPubliclyReadable(req, 7)).toBe(false);
    expect(mocks.reload).not.toHaveBeenCalled();
  });
});
