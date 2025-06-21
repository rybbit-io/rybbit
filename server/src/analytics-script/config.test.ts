import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseScriptConfig } from "./config.js";

describe("parseScriptConfig", () => {
  let mockScriptTag: HTMLScriptElement;
  let consoleSpy: any;

  beforeEach(() => {
    mockScriptTag = document.createElement("script");
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should parse valid configuration", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "123");

    const config = parseScriptConfig(mockScriptTag);

    expect(config).toEqual({
      analyticsHost: "https://analytics.example.com",
      siteId: "123",
      debounceDuration: 500,
      autoTrackPageview: true,
      autoTrackSpa: true,
      trackQuerystring: true,
      trackOutbound: true,
      enableWebVitals: false, // Default is false, only true when data-web-vitals="true"
      trackErrors: false, // Default is false, only true when data-track-errors="true"
      skipPatterns: [],
      maskPatterns: [],
      apiKey: undefined, // Default is undefined when no data-api-key attribute
    });
  });

  it("should handle missing src attribute", () => {
    const config = parseScriptConfig(mockScriptTag);
    expect(config).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("Script src attribute is missing");
  });

  it("should handle invalid analytics host", () => {
    mockScriptTag.setAttribute("src", "/script.js"); // No host part
    const config = parseScriptConfig(mockScriptTag);
    expect(config).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Please provide a valid analytics host"
    );
  });

  it("should handle missing site ID", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    const config = parseScriptConfig(mockScriptTag);
    expect(config).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Please provide a valid site ID using the data-site-id attribute"
    );
  });

  it("should handle invalid site ID", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "not-a-number");
    const config = parseScriptConfig(mockScriptTag);
    expect(config).toBeNull();
  });

  it("should parse custom debounce duration", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-debounce", "1000");

    const config = parseScriptConfig(mockScriptTag);
    expect(config?.debounceDuration).toBe(1000);
  });

  it("should handle negative debounce duration", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-debounce", "-100");

    const config = parseScriptConfig(mockScriptTag);
    expect(config?.debounceDuration).toBe(0);
  });

  it("should parse boolean flags correctly", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-auto-track-pageview", "false");
    mockScriptTag.setAttribute("data-track-spa", "false");
    mockScriptTag.setAttribute("data-track-query", "false");
    mockScriptTag.setAttribute("data-track-outbound", "false");

    const config = parseScriptConfig(mockScriptTag);
    expect(config?.autoTrackPageview).toBe(false);
    expect(config?.autoTrackSpa).toBe(false);
    expect(config?.trackQuerystring).toBe(false);
    expect(config?.trackOutbound).toBe(false);
  });

  it("should parse skip patterns", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute(
      "data-skip-patterns",
      '["/admin/**", "/api/**"]'
    );

    const config = parseScriptConfig(mockScriptTag);
    expect(config?.skipPatterns).toEqual(["/admin/**", "/api/**"]);
  });

  it("should parse mask patterns", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute(
      "data-mask-patterns",
      '["/user/*/profile", "/post/*"]'
    );

    const config = parseScriptConfig(mockScriptTag);
    expect(config?.maskPatterns).toEqual(["/user/*/profile", "/post/*"]);
  });

  it("should handle invalid JSON in patterns gracefully", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-skip-patterns", "invalid-json");

    const config = parseScriptConfig(mockScriptTag);
    expect(config?.skipPatterns).toEqual([]);
  });

  it("should support legacy site-id attribute", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("site-id", "456");

    const config = parseScriptConfig(mockScriptTag);
    expect(config?.siteId).toBe("456");
  });

  it("should enable web vitals when data-web-vitals is true", () => {
    mockScriptTag.setAttribute(
      "src",
      "https://analytics.example.com/script.js"
    );
    mockScriptTag.setAttribute("data-site-id", "123");
    mockScriptTag.setAttribute("data-web-vitals", "true");

    const config = parseScriptConfig(mockScriptTag);
    expect(config?.enableWebVitals).toBe(true);
  });
});
