import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseScriptConfig } from "./config.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("parseScriptConfig", () => {
  let mockScriptTag: HTMLScriptElement;
  let consoleSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    mockScriptTag = document.createElement("script");
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("should parse valid configuration with API response", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionReplay: true,
        webVitals: true,
        trackErrors: false,
        trackOutbound: true,
        trackUrlParams: false,
        trackInitialPageView: true,
        trackSpaNavigation: false,
      }),
    });

    const config = await parseScriptConfig(mockScriptTag);

    expect(config).toEqual({
      namespace: "rybbit",
      analyticsHost: "https://analytics.example.com",
      siteId: "123",
      debounceDuration: 500,
      autoTrackPageview: true, // trackInitialPageView from API
      autoTrackSpa: false, // trackSpaNavigation from API
      trackQuerystring: false, // trackUrlParams from API
      trackOutbound: true, // trackOutbound from API
      enableWebVitals: true, // webVitals from API
      trackErrors: false, // trackErrors from API
      enableSessionReplay: true, // sessionReplay from API
      trackButtonClicks: false,
      trackCopy: false,
      trackFormInteractions: false,
      skipPatterns: [],
      maskPatterns: [],
      sessionReplayBatchInterval: 5000,
      sessionReplayBatchSize: 250,
      sessionReplayMaskTextSelectors: [],
      // rrweb options (undefined when not set)
      sessionReplayBlockClass: undefined,
      sessionReplayBlockSelector: undefined,
      sessionReplayIgnoreClass: undefined,
      sessionReplayIgnoreSelector: undefined,
      sessionReplayMaskTextClass: undefined,
      sessionReplayMaskAllInputs: undefined,
      sessionReplayMaskInputOptions: undefined,
      sessionReplayCollectFonts: undefined,
      sessionReplaySampling: undefined,
      sessionReplaySlimDOMOptions: undefined,
      sessionReplaySampleRate: undefined,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://analytics.example.com/site/tracking-config/123",
      {
        method: "GET",
        credentials: "omit",
      }
    );
  });

  it("should use defaults when API call fails", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");

    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const config = await parseScriptConfig(mockScriptTag);

    expect(config).toEqual({
      namespace: "rybbit",
      analyticsHost: "https://analytics.example.com",
      siteId: "123",
      debounceDuration: 500,
      autoTrackPageview: true,
      autoTrackSpa: true,
      trackQuerystring: true,
      trackOutbound: true,
      enableWebVitals: false,
      trackErrors: false,
      enableSessionReplay: false,
      trackButtonClicks: false,
      trackCopy: false,
      trackFormInteractions: false,
      skipPatterns: [],
      maskPatterns: [],
      sessionReplayBatchInterval: 5000,
      sessionReplayBatchSize: 250,
      sessionReplayMaskTextSelectors: [],
      sessionReplayBlockClass: undefined,
      sessionReplayBlockSelector: undefined,
      sessionReplayIgnoreClass: undefined,
      sessionReplayIgnoreSelector: undefined,
      sessionReplayMaskTextClass: undefined,
      sessionReplayMaskAllInputs: undefined,
      sessionReplayMaskInputOptions: undefined,
      sessionReplayCollectFonts: undefined,
      sessionReplaySampling: undefined,
      sessionReplaySlimDOMOptions: undefined,
      sessionReplaySampleRate: undefined,
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Failed to fetch tracking config from API, using defaults"
    );
  });

  it("should use defaults when network error occurs", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");

    // Mock network error
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const config = await parseScriptConfig(mockScriptTag);

    expect(config).toEqual({
      namespace: "rybbit",
      analyticsHost: "https://analytics.example.com",
      siteId: "123",
      debounceDuration: 500,
      autoTrackPageview: true,
      autoTrackSpa: true,
      trackQuerystring: true,
      trackOutbound: true,
      enableWebVitals: false,
      trackErrors: false,
      enableSessionReplay: false,
      trackButtonClicks: false,
      trackCopy: false,
      trackFormInteractions: false,
      skipPatterns: [],
      maskPatterns: [],
      sessionReplayBatchInterval: 5000,
      sessionReplayBatchSize: 250,
      sessionReplayMaskTextSelectors: [],
      sessionReplayBlockClass: undefined,
      sessionReplayBlockSelector: undefined,
      sessionReplayIgnoreClass: undefined,
      sessionReplayIgnoreSelector: undefined,
      sessionReplayMaskTextClass: undefined,
      sessionReplayMaskAllInputs: undefined,
      sessionReplayMaskInputOptions: undefined,
      sessionReplayCollectFonts: undefined,
      sessionReplaySampling: undefined,
      sessionReplaySlimDOMOptions: undefined,
      sessionReplaySampleRate: undefined,
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Error fetching tracking config:",
      expect.any(Error)
    );
  });

  it("should handle missing src attribute", async () => {
    const config = await parseScriptConfig(mockScriptTag);
    expect(config).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("Script src attribute is missing");
  });

  it("should handle invalid analytics host", async () => {
    mockScriptTag.setAttribute("src", "/script.js"); // No host part
    const config = await parseScriptConfig(mockScriptTag);
    expect(config).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("Please provide a valid analytics host");
  });

  it("should handle missing site ID", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    const config = await parseScriptConfig(mockScriptTag);
    expect(config).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("Please provide a valid site ID using the data-site-id attribute");
  });

  it("should parse non-numeric site ID", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "my-site");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionReplay: false,
        webVitals: false,
        trackErrors: false,
        trackOutbound: true,
        trackUrlParams: true,
        trackInitialPageView: true,
        trackSpaNavigation: true,
      }),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.siteId).toBe("my-site");
  });

  it("should parse custom debounce duration", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-debounce", "1000");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.debounceDuration).toBe(1000);
  });

  it("should handle negative debounce duration", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-debounce", "-100");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.debounceDuration).toBe(0);
  });

  it("should override API config with data attributes for testing", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-skip-patterns", '["/admin/**"]');
    mockScriptTag.setAttribute("data-mask-patterns", '["/user/**"]');

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionReplay: true,
        webVitals: true,
        trackErrors: true,
        trackOutbound: false,
        trackUrlParams: false,
        trackInitialPageView: false,
        trackSpaNavigation: false,
      }),
    });

    const config = await parseScriptConfig(mockScriptTag);

    // These should be from data attributes (overrides for testing)
    expect(config?.skipPatterns).toEqual(["/admin/**"]);
    expect(config?.maskPatterns).toEqual(["/user/**"]);

    // These should be from API
    expect(config?.enableSessionReplay).toBe(true);
    expect(config?.enableWebVitals).toBe(true);
    expect(config?.trackErrors).toBe(true);
    expect(config?.trackOutbound).toBe(false);
  });

  it("should parse skip patterns", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-skip-patterns", '["/admin/**", "/api/**"]');

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.skipPatterns).toEqual(["/admin/**", "/api/**"]);
  });

  it("should parse mask patterns", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-mask-patterns", '["/user/*/profile", "/post/*"]');

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.maskPatterns).toEqual(["/user/*/profile", "/post/*"]);
  });

  it("should handle invalid JSON in patterns gracefully", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-skip-patterns", "invalid-json");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.skipPatterns).toEqual([]);
  });

  it("should support legacy site-id attribute", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("site-id", "456");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.siteId).toBe("456");
  });

  it("should parse session replay batch settings", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-batch-size", "500");
    mockScriptTag.setAttribute("data-replay-batch-interval", "10000");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplayBatchSize).toBe(500);
    expect(config?.sessionReplayBatchInterval).toBe(10000);
  });

  it("should parse session replay mask text selectors", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-mask-text-selectors", '[".user-name", ".email-address", "[data-sensitive]"]');

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplayMaskTextSelectors).toEqual([".user-name", ".email-address", "[data-sensitive]"]);
  });

  it("should parse rrweb block and ignore options", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-block-class", "my-block-class");
    mockScriptTag.setAttribute("data-replay-block-selector", ".sensitive-content");
    mockScriptTag.setAttribute("data-replay-ignore-class", "my-ignore-class");
    mockScriptTag.setAttribute("data-replay-ignore-selector", "input[type='password']");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplayBlockClass).toBe("my-block-class");
    expect(config?.sessionReplayBlockSelector).toBe(".sensitive-content");
    expect(config?.sessionReplayIgnoreClass).toBe("my-ignore-class");
    expect(config?.sessionReplayIgnoreSelector).toBe("input[type='password']");
  });

  it("should parse rrweb mask text class option", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-mask-text-class", "custom-mask-class");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplayMaskTextClass).toBe("custom-mask-class");
  });

  it("should parse rrweb maskAllInputs option", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-mask-all-inputs", "true");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplayMaskAllInputs).toBe(true);
  });

  it("should parse rrweb maskAllInputs as false", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-mask-all-inputs", "false");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplayMaskAllInputs).toBe(false);
  });

  it("should parse rrweb maskInputOptions", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-mask-input-options", '{"password":true,"email":true,"tel":true}');

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplayMaskInputOptions).toEqual({ password: true, email: true, tel: true });
  });

  it("should parse rrweb collectFonts option", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-collect-fonts", "false");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplayCollectFonts).toBe(false);
  });

  it("should parse rrweb sampling options", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-sampling", '{"mousemove":100,"scroll":200}');

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplaySampling).toEqual({ mousemove: 100, scroll: 200 });
  });

  it("should parse rrweb slimDOMOptions as object", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-slim-dom-options", '{"script":true,"comment":true}');

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplaySlimDOMOptions).toEqual({ script: true, comment: true });
  });

  it("should parse rrweb slimDOMOptions as boolean", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-slim-dom-options", "true");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    expect(config?.sessionReplaySlimDOMOptions).toBe(true);
  });

  it("should handle invalid JSON in rrweb options gracefully", async () => {
    mockScriptTag.setAttribute("src", "https://analytics.example.com/script.js");
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-replay-sampling", "invalid-json");

    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const config = await parseScriptConfig(mockScriptTag);
    // Should fallback to empty object for invalid JSON
    expect(config?.sessionReplaySampling).toEqual({});
  });
});
