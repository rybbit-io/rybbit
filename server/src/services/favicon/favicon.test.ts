import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicHttp } from "../../lib/publicHttpFetch.js";
import { FaviconService } from "./favicon.js";

vi.mock("../../lib/publicHttpFetch.js", () => ({ fetchPublicHttp: vi.fn() }));
const fetchMock = vi.mocked(fetchPublicHttp);
const png = Buffer.from("89504e470d0a1a0a", "hex");

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
});
afterEach(() => vi.useRealTimers());

function website(icon: string, body = png) {
  fetchMock.mockImplementation(async url => ({
    url,
    status: 200,
    headers: { "content-type": url.pathname === "/" ? "text/html" : "image/png" },
    body: url.pathname === "/" ? Buffer.from(`<link rel="icon" href="${icon}">`) : body,
  }));
}

describe("FaviconService", () => {
  it("discovers the declared icon and fetches new HTML and bytes after cache expiry", async () => {
    const service = new FaviconService();
    website("/old.png");
    expect((await service.get("example.com")).icon?.body).toEqual(png);
    expect(fetchMock.mock.calls[1][0].pathname).toBe("/old.png");
    website("/new.png", Buffer.concat([png, Buffer.from("new")]));
    await service.get("example.com");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect((await service.get("example.com")).icon?.body).toEqual(Buffer.concat([png, Buffer.from("new")]));
    expect(fetchMock.mock.calls[3][0].pathname).toBe("/new.png");
  });

  it("refreshes changed bytes at the same icon URL", async () => {
    const service = new FaviconService();
    website("/favicon.png");
    await service.get("example.com");
    vi.advanceTimersByTime(60 * 60 * 1000);
    website("/favicon.png", Buffer.concat([png, Buffer.from("updated")]));
    expect((await service.get("example.com")).icon?.body.length).toBeGreaterThan(png.length);
  });

  it("shares in-flight requests for the same domain", async () => {
    website("/favicon.png");
    const service = new FaviconService();
    await Promise.all([service.get("example.com"), service.get("example.com")]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("queues larger site lists instead of failing icons beyond the concurrency limit", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    fetchMock.mockImplementation(async url => {
      if (url.pathname === "/") await gate;
      return {
        url,
        status: 200,
        headers: {},
        body: url.pathname === "/" ? Buffer.from('<link rel="icon" href="/icon.png">') : png,
      };
    });
    const service = new FaviconService();
    const requests = Array.from({ length: 21 }, (_, i) => service.get(`site${i}.example.com`));
    expect(fetchMock).toHaveBeenCalledTimes(20);
    release();
    expect((await Promise.all(requests)).every(result => result.icon !== null)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(42);
  });

  it("falls back to /favicon.ico when HTML contains no usable icon", async () => {
    website("data:image/png;base64,abc");
    await new FaviconService().get("example.com");
    expect(fetchMock.mock.calls[1][0].pathname).toBe("/favicon.ico");
  });

  it("resolves relative icons against the final homepage URL and HTML base", async () => {
    fetchMock
      .mockResolvedValueOnce({
        url: new URL("https://www.example.com/app/"),
        status: 200,
        headers: {},
        body: Buffer.from('<base href="/assets/"><link href="icon.png?a=1&amp;b=2" rel="shortcut icon">'),
      })
      .mockResolvedValueOnce({
        url: new URL("https://www.example.com/assets/icon.png"),
        status: 200,
        headers: {},
        body: png,
      });
    await new FaviconService().get("example.com");
    expect(fetchMock.mock.calls[1][0].href).toBe("https://www.example.com/assets/icon.png?a=1&b=2");
  });

  it("does not serve an HTML error page as an image and retries failures after five minutes", async () => {
    website("/favicon.png", Buffer.from("<html>Access denied</html>"));
    const service = new FaviconService();
    expect((await service.get("example.com")).icon).toBeNull();
    website("/favicon.png");
    expect((await service.get("example.com")).icon).toBeNull();
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect((await service.get("example.com")).icon?.body).toEqual(png);
  });
});
