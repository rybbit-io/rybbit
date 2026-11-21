import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicHttp, isPublicHttpAddress } from "./publicHttpFetch.js";

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:http", () => ({ request: mocks.request }));
vi.mock("node:https", () => ({ request: mocks.request }));

beforeEach(() => {
  mocks.lookup.mockReset().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  mocks.request.mockReset();
});

function respond(status = 200, headers: Record<string, string> = {}, chunks = [Buffer.from("icon")]) {
  mocks.request.mockImplementationOnce((_url, _options, callback) => {
    const response = Object.assign(Readable.from(chunks), { statusCode: status, headers });
    const request = Object.assign(new EventEmitter(), { end: () => callback(response) });
    return request;
  });
}

function fetchUrl(url = "https://example.com/") {
  return fetchPublicHttp(new URL(url), { signal: AbortSignal.timeout(1000), maxBytes: 32 });
}

describe("public HTTP fetch", () => {
  it("pins the connection to validated DNS addresses and revalidates upstream caches", async () => {
    respond();
    expect((await fetchUrl()).body.toString()).toBe("icon");
    const options = mocks.request.mock.calls[0][1];
    const callback = vi.fn();
    options.lookup("example.com", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
    expect(mocks.lookup).toHaveBeenCalledTimes(1);
    expect(options.headers["Cache-Control"]).toBe("no-cache");
    expect(options.agent).toBe(false);
  });

  it.each([
    "http://127.0.0.1/",
    "http://169.254.169.254/",
    "http://[::1]/",
    "http://[::ffff:7f00:1]/",
    "file:///etc/passwd",
    "https://example.com:8080/",
    "https://user:pass@example.com/",
    "https://service.local/",
  ])("blocks unsafe targets: %s", async url => {
    await expect(fetchUrl(url)).rejects.toThrow();
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("rejects a hostname with any private DNS result", async () => {
    mocks.lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);
    await expect(fetchUrl()).rejects.toThrow("Non-public");
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("rejects a redirect to an internal target", async () => {
    respond(302, { location: "http://169.254.169.254/latest/meta-data/" });
    await expect(fetchUrl()).rejects.toThrow("Non-public");
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });

  it("resolves relative redirects and bounds the redirect count", async () => {
    for (let i = 0; i < 4; i++) respond(302, { location: "/next" });
    await expect(fetchUrl()).rejects.toThrow("Too many redirects");
    expect(mocks.request).toHaveBeenCalledTimes(4);
    expect(mocks.request.mock.calls[1][0].href).toBe("https://example.com/next");
  });

  it("caps streamed responses without trusting Content-Length", async () => {
    respond(200, {}, [Buffer.alloc(20), Buffer.alloc(20)]);
    await expect(fetchUrl()).rejects.toThrow("Response too large");
  });

  it("bounds DNS resolution by the overall abort signal", async () => {
    mocks.lookup.mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const pending = fetchPublicHttp(new URL("https://example.com/"), { signal: controller.signal, maxBytes: 32 });
    controller.abort(new Error("Deadline exceeded"));
    await expect(pending).rejects.toThrow("Deadline exceeded");
    expect(mocks.request).not.toHaveBeenCalled();
  });
});

describe("public HTTP addresses", () => {
  it.each([
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "192.0.2.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "::",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:a00:1",
    "64:ff9b::a00:1",
    "2001:db8::1",
    "2002:a00:1::1",
    "3fff::1",
  ])("blocks private and reserved addresses: %s", address => {
    expect(isPublicHttpAddress(address)).toBe(false);
  });
  it.each(["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111"])("allows public addresses: %s", address => {
    expect(isPublicHttpAddress(address)).toBe(true);
  });
});
