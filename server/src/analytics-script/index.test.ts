import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScriptConfig } from "./types.js";

const mocks = vi.hoisted(() => ({ parseScriptConfig: vi.fn() }));
vi.mock("./config.js", () => ({ parseScriptConfig: mocks.parseScriptConfig }));

describe("automatic navigation tracking", () => {
  let config: ScriptConfig;
  let location: { href: string };
  let originalLocation: PropertyDescriptor | undefined;
  let originalPushState: History["pushState"];
  let originalReplaceState: History["replaceState"];
  let windowListeners: ReturnType<typeof vi.spyOn>;
  let documentListeners: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    originalLocation = Object.getOwnPropertyDescriptor(window, "location");
    location = { href: "https://example.com/checkout/" };
    Object.defineProperty(window, "location", { configurable: true, value: location });
    originalPushState = history.pushState;
    originalReplaceState = history.replaceState;
    const navigate = (_data: unknown, _unused: string, url?: string | URL | null) => {
      if (url != null) location.href = new URL(String(url), location.href).href;
    };
    history.pushState = navigate;
    history.replaceState = navigate;
    windowListeners = vi.spyOn(window, "addEventListener");
    documentListeners = vi.spyOn(document, "addEventListener");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    localStorage.clear();
    document.body.innerHTML = '<script src="https://analytics.example.com/script.js"></script>';
    config = {
      namespace: "rybbit",
      analyticsHost: "https://analytics.example.com",
      siteId: "17571",
      visitorId: "visitor",
      debounceDuration: 500,
      autoTrackPageview: true,
      autoTrackSpa: true,
      trackQuerystring: true,
      trackUrlFragments: false,
      trackOutbound: false,
      enableWebVitals: false,
      trackErrors: false,
      enableSessionReplay: false,
      sessionReplayBatchSize: 250,
      sessionReplayBatchInterval: 5000,
      sessionReplayMaskTextSelectors: [],
      skipPatterns: [],
      maskPatterns: [],
      trackButtonClicks: false,
      trackCopy: false,
      trackFormInteractions: false,
      tag: "",
      featureFlagsEnabled: false,
      featureFlags: {},
    };
    mocks.parseScriptConfig.mockImplementation(async () => config);
  });

  afterEach(() => {
    window.dispatchEvent(new Event("beforeunload"));
    for (const [type, listener, options] of windowListeners.mock.calls) {
      window.removeEventListener(type as string, listener as EventListener, options as boolean);
    }
    for (const [type, listener, options] of documentListeners.mock.calls) {
      document.removeEventListener(type as string, listener as EventListener, options as boolean);
    }
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    if (originalLocation) Object.defineProperty(window, "location", originalLocation);
    delete (window as Partial<Window>).rybbit;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function start() {
    await import("./index.js");
    await vi.advanceTimersByTimeAsync(0);
  }

  function pageviews() {
    return vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init!.body as string));
  }

  async function changeHash(hash: string) {
    const url = new URL(location.href);
    url.hash = hash;
    location.href = url.href;
    window.dispatchEvent(new Event("hashchange"));
    await vi.advanceTimersByTimeAsync(500);
  }

  it("ignores ordinary anchor changes and same-URL History API updates", async () => {
    await start();
    await changeHash("#shipping");
    history.replaceState({}, "", location.href);
    await vi.advanceTimersByTimeAsync(500);
    await changeHash("#payment");
    expect(pageviews().map(event => event.pathname)).toEqual(["/checkout/"]);
  });

  it("records checkout fragments separately when enabled, including returning to the base path", async () => {
    config.trackUrlFragments = true;
    location.href += "#shipping";
    await start();
    await changeHash("#payment");
    await changeHash("");
    expect(pageviews().map(event => event.pathname)).toEqual([
      "/checkout/#shipping",
      "/checkout/#payment",
      "/checkout/",
    ]);
  });

  it("tracks slash-prefixed and hashbang routes automatically", async () => {
    await start();
    await changeHash("#/shipping");
    await changeHash("#!/payment");
    expect(pageviews().map(event => event.pathname)).toEqual(["/checkout/", "/shipping", "/payment"]);
  });

  it("records one pageview when popstate and hashchange describe the same navigation", async () => {
    config.debounceDuration = 0;
    await start();
    location.href += "#/shipping";
    window.dispatchEvent(new Event("popstate"));
    window.dispatchEvent(new Event("hashchange"));
    expect(pageviews().map(event => event.pathname)).toEqual(["/checkout/", "/shipping"]);
  });

  it("honors URL parameter tracking when deciding whether navigation changed", async () => {
    config.trackQuerystring = false;
    await start();
    history.pushState({}, "", "/checkout/?utm_source=test");
    await vi.advanceTimersByTimeAsync(500);
    expect(pageviews()).toHaveLength(1);
    config.trackQuerystring = true;
    history.pushState({}, "", "/checkout/?utm_source=other");
    await vi.advanceTimersByTimeAsync(500);
    expect(pageviews().map(event => event.querystring)).toEqual(["", "?utm_source=other"]);
  });

  it("allows explicit pageviews of an unchanged URL", async () => {
    await start();
    window.rybbit.pageview();
    window.rybbit.pageview();
    await changeHash("#shipping");
    expect(pageviews()).toHaveLength(3);
  });

  it("ignores anchors with initial tracking disabled and still tracks subsequent routes", async () => {
    config.autoTrackPageview = false;
    await start();
    await changeHash("#shipping");
    expect(pageviews()).toHaveLength(0);
    history.pushState({}, "", "/order/success/");
    await vi.advanceTimersByTimeAsync(500);
    expect(pageviews().map(event => event.pathname)).toEqual(["/order/success/"]);
  });
});
