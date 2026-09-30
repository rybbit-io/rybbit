import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  request: vi.fn(),
  bodyError: false,
  location: "",
}));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:http", () => ({ request: mocks.request }));
vi.mock("node:https", () => ({ request: mocks.request }));
vi.mock("../../lib/logger/logger.js", () => ({ createServiceLogger: () => ({ debug: vi.fn() }) }));

import { fetchHomepage } from "./platformDetect.js";

type ResponseStub = EventEmitter & { statusCode: number; headers: { location?: string }; destroy: () => void };
type LookupOptions = {
  lookup: (
    host: string,
    options: { all: boolean },
    callback: (error: Error | null, addresses?: unknown) => void
  ) => void;
};

beforeEach(() => {
  mocks.bodyError = false;
  mocks.location = "";
  mocks.lookup.mockReset().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  mocks.request
    .mockReset()
    .mockImplementation((url: URL, options: LookupOptions, onResponse: (response: ResponseStub) => void) => {
      const request = new EventEmitter() as EventEmitter & { end: () => void };
      request.end = () => {
        options.lookup(url.hostname, { all: true }, error => {
          if (error) {
            request.emit("error", error);
            return;
          }
          const response = Object.assign(new EventEmitter(), {
            statusCode: mocks.location ? 302 : 200,
            headers: { location: mocks.location || undefined },
            destroy: vi.fn(),
          });
          onResponse(response);
          queueMicrotask(() => {
            if (mocks.bodyError) response.emit("error", new Error("body read failed"));
            else {
              response.emit("data", Buffer.from("<html>public</html>"));
              response.emit("end");
            }
          });
        });
      };
      return request;
    });
});

describe("fetchHomepage connection safety", () => {
  it("reads a publicly resolved page", async () => {
    await expect(fetchHomepage("example.net")).resolves.toBe("<html>public</html>");
  });

  it("rejects DNS rebinding between preflight and the socket lookup", async () => {
    mocks.lookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    await expect(fetchHomepage("example.net")).resolves.toBeNull();
    expect(mocks.request).toHaveBeenCalledOnce();
  });

  it("returns null when reading the response body fails", async () => {
    mocks.bodyError = true;
    await expect(fetchHomepage("example.net")).resolves.toBeNull();
  });

  it("rejects hexadecimal IPv4-mapped loopback redirects", async () => {
    mocks.location = "http://[::ffff:7f00:1]/";
    await expect(fetchHomepage("example.net")).resolves.toBeNull();
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
});
