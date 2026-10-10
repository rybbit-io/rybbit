import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { faviconService } from "../../services/favicon/favicon.js";
import { getFavicon } from "./getFavicon.js";

const server = Fastify();
server.get("/favicon", getFavicon);
let get: MockInstance<typeof faviconService.get>;
beforeEach(() => {
  get = vi.spyOn(faviconService, "get");
});
afterEach(() => vi.restoreAllMocks());

describe("favicon endpoint", () => {
  it("returns image bytes with only the remaining cache lifetime", async () => {
    get.mockResolvedValue({
      icon: { body: Buffer.from("icon"), contentType: "image/png" },
      expiresAt: Date.now() + 60_000,
    });
    const response = await server.inject("/favicon?domain=Example.com.&v=123");
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("icon");
    expect(get).toHaveBeenCalledWith("example.com");
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["cache-control"]).toMatch(/^public, max-age=(59|60), must-revalidate$/);
    expect(response.headers["content-security-policy"]).toBe("default-src 'none'; sandbox");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it.each([
    "",
    "?domain=https://example.com",
    "?domain=user@example.com",
    "?domain=example.com/path",
    "?domain=example.com:8080",
  ])("rejects malformed domains without fetching: %s", query => {
    return server.inject(`/favicon${query}`).then(response => {
      expect(response.statusCode).toBe(400);
      expect(get).not.toHaveBeenCalled();
      expect(response.headers["cache-control"]).toBe("no-store");
    });
  });

  it("does not browser-cache missing icons", async () => {
    get.mockResolvedValue({ icon: null, expiresAt: Date.now() + 300_000 });
    const response = await server.inject("/favicon?domain=example.com");
    expect(response.statusCode).toBe(404);
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
