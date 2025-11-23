import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Tracker } from "./tracking.js";
import { ScriptConfig } from "./types.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("Tracker", () => {
  let tracker: Tracker;
  let config: ScriptConfig;
  let mockLocation: any;

  beforeEach(() => {
    // Reset fetch mock
    vi.mocked(global.fetch).mockReset();
    vi.mocked(global.fetch).mockResolvedValue({} as Response);

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock window properties
    mockLocation = {
      href: "https://example.com/page?query=test",
      hostname: "example.com",
      pathname: "/page",
      search: "?query=test",
      hash: "",
    };

    Object.defineProperty(window, "location", {
      value: mockLocation,
      configurable: true,
      writable: true,
    });

    // Mock URL constructor to use our mockLocation
    global.URL = vi.fn().mockImplementation(() => ({
      hostname: mockLocation.hostname,
      pathname: mockLocation.pathname,
      search: mockLocation.search,
      hash: mockLocation.hash,
    })) as any;

    Object.defineProperty(screen, "width", {
      value: 1920,
      writable: true,
    });

    Object.defineProperty(screen, "height", {
      value: 1080,
      writable: true,
    });

    Object.defineProperty(navigator, "language", {
      value: "en-US",
      writable: true,
    });

    Object.defineProperty(document, "title", {
      value: "Test Page",
      writable: true,
    });

    Object.defineProperty(document, "referrer", {
      value: "https://google.com",
      writable: true,
    });

    config = {
      analyticsHost: "https://analytics.example.com",
      siteId: "123",
      debounceDuration: 0,
      autoTrackPageview: true,
      autoTrackSpa: true,
      trackQuerystring: true,
      trackOutbound: true,
      trackErrors: false,
      enableWebVitals: false,
      enableSessionReplay: false,
      sessionReplayBatchSize: 50,
      sessionReplayBatchInterval: 5000,
      sessionReplayMaskTextSelectors: [],
      skipPatterns: [],
      maskPatterns: [],
    };

    tracker = new Tracker(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createBasePayload", () => {
    it("should create base payload with all required fields", () => {
      const payload = tracker.createBasePayload();

      expect(payload).toEqual({
        site_id: "123",
        hostname: "example.com",
        pathname: "/page",
        querystring: "?query=test",
        screenWidth: 1920,
        screenHeight: 1080,
        language: "en-US",
        page_title: "Test Page",
        referrer: "https://google.com",
      });
    });

    it("should handle hash-based routing", () => {
      mockLocation.hash = "#/dashboard/users";
      const payload = tracker.createBasePayload();
      expect(payload?.pathname).toBe("/dashboard/users");
    });

    it("should skip tracking for matching skip patterns", () => {
      config.skipPatterns = ["/admin/**", "/api/**"];
      tracker = new Tracker(config);

      mockLocation.pathname = "/admin/settings";
      const payload = tracker.createBasePayload();
      expect(payload).toBeNull();
    });

    it("should apply mask patterns", () => {
      config.maskPatterns = ["/user/*/profile"];
      tracker = new Tracker(config);

      mockLocation.pathname = "/user/123/profile";
      const payload = tracker.createBasePayload();
      expect(payload?.pathname).toBe("/user/*/profile");
    });

    it("should exclude querystring when disabled", () => {
      config.trackQuerystring = false;
      tracker = new Tracker(config);

      const payload = tracker.createBasePayload();
      expect(payload?.querystring).toBe("");
    });

    it("should include user ID when set", () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue("user-123");
      tracker = new Tracker(config);

      const payload = tracker.createBasePayload();
      expect(payload?.user_id).toBe("user-123");
    });
  });

  describe("tracking methods", () => {
    it("should track pageview", async () => {
      tracker.trackPageview();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://analytics.example.com/track",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining('"type":"pageview"'),
          mode: "cors",
          keepalive: true,
        })
      );
    });

    it("should track custom event", async () => {
      tracker.trackEvent("button_click", { button: "submit" });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://analytics.example.com/track",
        expect.objectContaining({
          body: expect.stringContaining('"type":"custom_event"'),
        })
      );

      const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
      expect(body.event_name).toBe("button_click");
      expect(body.properties).toBe(JSON.stringify({ button: "submit" }));
    });

    it("should validate custom event name", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      tracker.trackEvent("", {});
      expect(global.fetch).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Event name is required and must be a string for custom events");

      consoleSpy.mockRestore();
    });

    it("should track outbound link", async () => {
      tracker.trackOutbound("https://external.com", "External Link", "_blank");

      const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
      expect(body.type).toBe("outbound");
      expect(body.properties).toBe(
        JSON.stringify({
          url: "https://external.com",
          text: "External Link",
          target: "_blank",
        })
      );
    });

    it("should track web vitals", async () => {
      const vitals = {
        lcp: 2500,
        cls: 0.1,
        inp: 200,
        fcp: 1800,
        ttfb: 800,
      };

      tracker.trackWebVitals(vitals);

      const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string);
      expect(body.type).toBe("performance");
      expect(body.event_name).toBe("web-vitals");
      expect(body.lcp).toBe(2500);
      expect(body.cls).toBe(0.1);
    });

    it("should handle fetch errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      tracker.trackPageview();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith("Failed to send tracking data:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    describe("error tracking", () => {
      it("should track first-party errors", () => {
        // Enable error tracking for this test
        const errorConfig = { ...config, trackErrors: true };
        const tracker = new Tracker(errorConfig);
        const sendSpy = vi.spyOn(tracker, "sendTrackingData").mockResolvedValue();

        const error = new Error("Test error");
        error.stack = "Error: Test error\n    at https://example.com/app.js:10:5";

        tracker.trackError(error, {
          filename: "https://example.com/app.js",
          lineno: 10,
          colno: 5,
        });

        expect(sendSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "error",
            event_name: "Error",
            properties: expect.stringContaining("Test error"),
          })
        );
      });

      it("should filter out third-party errors by filename", () => {
        const errorConfig = { ...config, trackErrors: true };
        const tracker = new Tracker(errorConfig);
        const sendSpy = vi.spyOn(tracker, "sendTrackingData").mockResolvedValue();

        // Mock window.location.origin to ensure we have a proper origin for comparison
        Object.defineProperty(window, "location", {
          value: {
            ...mockLocation,
            origin: "https://example.com",
          },
          configurable: true,
          writable: true,
        });

        const error = new Error("Third party error");
        // Clear the stack to avoid test environment paths interfering
        error.stack = undefined;

        tracker.trackError(error, {
          filename: "https://ads.google.com/script.js",
          lineno: 1,
          colno: 1,
        });

        expect(sendSpy).not.toHaveBeenCalled();
      });

      it("should filter out third-party errors by stack trace", () => {
        const errorConfig = { ...config, trackErrors: true };
        const tracker = new Tracker(errorConfig);
        const sendSpy = vi.spyOn(tracker, "sendTrackingData").mockResolvedValue();

        const error = new Error("Third party error");
        error.stack = "Error: Third party error\n    at https://ads.google.com/script.js:1:1";

        tracker.trackError(error, {
          lineno: 1,
          colno: 1,
        });

        expect(sendSpy).not.toHaveBeenCalled();
      });

      it("should track errors with unknown origin (e.g., NetworkError)", () => {
        const errorConfig = { ...config, trackErrors: true };
        const tracker = new Tracker(errorConfig);
        const sendSpy = vi.spyOn(tracker, "sendTrackingData").mockResolvedValue();

        const error = new Error("NetworkError when attempting to fetch resource");
        error.name = "TypeError";
        // Clear stack to avoid test environment paths
        error.stack = undefined;

        tracker.trackError(error, {
          type: "unhandledrejection",
        });

        expect(sendSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "error",
            event_name: "TypeError",
            properties: expect.stringContaining("NetworkError"),
          })
        );
      });

      it("should handle invalid filename URLs gracefully", () => {
        const errorConfig = { ...config, trackErrors: true };
        const tracker = new Tracker(errorConfig);
        const sendSpy = vi.spyOn(tracker, "sendTrackingData").mockResolvedValue();

        const error = new Error("Test error");
        error.stack = "Error: Test error\n    at https://example.com/app.js:10:5";

        tracker.trackError(error, {
          filename: "invalid-url",
          lineno: 10,
          colno: 5,
        });

        // Should fall back to stack trace check and track the error
        expect(sendSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "error",
            event_name: "Error",
            properties: expect.stringContaining("Test error"),
          })
        );
      });
    });
  });

  describe("user identification", () => {
    it("should identify user", () => {
      tracker.identify("user-456");

      expect(window.localStorage.setItem).toHaveBeenCalledWith("rybbit-user-id", "user-456");
      expect(tracker.getUserId()).toBe("user-456");
    });

    it("should validate user ID", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      tracker.identify("");
      expect(window.localStorage.setItem).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("User ID must be a non-empty string");

      consoleSpy.mockRestore();
    });

    it("should clear user ID", () => {
      tracker.identify("user-789");
      tracker.clearUserId();

      expect(window.localStorage.removeItem).toHaveBeenCalledWith("rybbit-user-id");
      expect(tracker.getUserId()).toBeNull();
    });

    it("should handle localStorage errors", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(window.localStorage.setItem).mockImplementation(() => {
        throw new Error("Storage full");
      });

      tracker.identify("user-123");
      expect(consoleSpy).toHaveBeenCalledWith("Could not persist user ID to localStorage");

      consoleSpy.mockRestore();
    });
  });
});
