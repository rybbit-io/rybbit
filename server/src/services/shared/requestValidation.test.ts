import { beforeEach, describe, expect, it, vi } from "vitest";

// Define the expected site config type to match SiteConfigData
interface SiteConfigData {
  id: string;
  siteId: number;
  domain: string;
  apiKey?: string | null;
  public: boolean;
  saltUserIds: boolean;
  blockBots: boolean;
  excludedIPs: string[];
  excludedCountries: string[];
  sessionReplay: boolean;
  webVitals: boolean;
  trackErrors: boolean;
  trackOutbound: boolean;
  trackUrlParams: boolean;
  trackInitialPageView: boolean;
  trackSpaNavigation: boolean;
  trackIp: boolean;
}

// Mock dependencies
vi.mock("../../lib/rateLimiter.js", () => ({
  apiKeyRateLimiter: {
    isAllowed: vi.fn(),
  },
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: {
    getSiteConfig: vi.fn(),
  },
}));

vi.mock("../../utils.js", () => ({
  normalizeOrigin: vi.fn(),
}));

import { checkApiKeyRateLimit, validateApiKey } from "./requestValidation.js";

// Import mocked modules
import { apiKeyRateLimiter } from "../../lib/rateLimiter.js";
import { siteConfig } from "../../lib/siteConfig.js";

describe("validateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success false when no API key is provided", async () => {
    const result = await validateApiKey(1);
    expect(result).toEqual({ success: false });
  });

  it("should return success false when API key is empty string", async () => {
    const result = await validateApiKey(1, "");
    expect(result).toEqual({ success: false });
  });

  it("should return success false when site is not found", async () => {
    vi.mocked(siteConfig.getConfig).mockResolvedValue(undefined);

    const result = await validateApiKey(1, "test-api-key");

    expect(siteConfig.getConfig).toHaveBeenCalledWith(1);
    expect(result).toEqual({ success: false, error: "Site not found" });
  });

  it("should return success true when API key matches", async () => {
    const mockSite: SiteConfigData = {
      id: "test-id",
      siteId: 1,
      apiKey: "valid-api-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
      excludedCountries: [],
      sessionReplay: false,
      webVitals: false,
      trackErrors: false,
      trackOutbound: true,
      trackUrlParams: true,
      trackInitialPageView: true,
      trackSpaNavigation: true,
      trackIp: false,
    };

    vi.mocked(siteConfig.getConfig).mockResolvedValue(mockSite);

    // Mock console.info to avoid output during tests
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await validateApiKey(1, "valid-api-key");

    expect(result).toEqual({ success: true });
    expect(consoleSpy).toHaveBeenCalledWith("[Validation] Valid API key for site 1");

    consoleSpy.mockRestore();
  });

  it("should return success false when API key does not match", async () => {
    const mockSite: SiteConfigData = {
      id: "test-id",
      siteId: 1,
      apiKey: "valid-api-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
      excludedCountries: [],
      sessionReplay: false,
      webVitals: false,
      trackErrors: false,
      trackOutbound: true,
      trackUrlParams: true,
      trackInitialPageView: true,
      trackSpaNavigation: true,
      trackIp: false,
    };

    vi.mocked(siteConfig.getConfig).mockResolvedValue(mockSite);

    const result = await validateApiKey(1, "invalid-api-key");

    expect(result).toEqual({ success: false, error: "Invalid API key" });
  });

  it("should handle string siteId by converting to number", async () => {
    const mockSite: SiteConfigData = {
      id: "test-id",
      siteId: 123,
      apiKey: "test-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
      excludedCountries: [],
      sessionReplay: false,
      webVitals: false,
      trackErrors: false,
      trackOutbound: true,
      trackUrlParams: true,
      trackInitialPageView: true,
      trackSpaNavigation: true,
      trackIp: false,
    };

    vi.mocked(siteConfig.getConfig).mockResolvedValue(mockSite);

    await validateApiKey("123", "test-key");

    expect(siteConfig.getConfig).toHaveBeenCalledWith(123);
  });

  it("should handle site with no API key configured", async () => {
    const mockSite: Partial<SiteConfigData> &
      Pick<
        SiteConfigData,
        | "id"
        | "siteId"
        | "domain"
        | "public"
        | "saltUserIds"
        | "blockBots"
        | "excludedIPs"
        | "sessionReplay"
        | "webVitals"
        | "trackErrors"
        | "trackOutbound"
        | "trackUrlParams"
        | "trackInitialPageView"
        | "trackSpaNavigation"
      > = {
      id: "test-id",
      siteId: 1,
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
      excludedCountries: [],
      sessionReplay: false,
      webVitals: false,
      trackErrors: false,
      trackOutbound: true,
      trackUrlParams: true,
      trackInitialPageView: true,
      trackSpaNavigation: true,
      trackIp: false,
    }; // No apiKey property

    vi.mocked(siteConfig.getConfig).mockResolvedValue(mockSite as SiteConfigData);

    const result = await validateApiKey(1, "any-key");

    expect(result).toEqual({ success: false, error: "Invalid API key" });
  });

  it("should handle errors during validation", async () => {
    vi.mocked(siteConfig.getConfig).mockRejectedValue(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await validateApiKey(1, "test-key");

    expect(result).toEqual({ success: false, error: "Failed to validate API key" });
    expect(consoleSpy).toHaveBeenCalledWith("Error validating API key:", expect.any(Error));

    consoleSpy.mockRestore();
  });
});

describe("checkApiKeyRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when rate limiter allows the request", () => {
    vi.mocked(apiKeyRateLimiter.isAllowed).mockReturnValue(true);

    const result = checkApiKeyRateLimit("test-api-key");

    expect(apiKeyRateLimiter.isAllowed).toHaveBeenCalledWith("test-api-key");
    expect(result).toBe(true);
  });

  it("should return false when rate limiter blocks the request", () => {
    vi.mocked(apiKeyRateLimiter.isAllowed).mockReturnValue(false);

    const result = checkApiKeyRateLimit("test-api-key");

    expect(apiKeyRateLimiter.isAllowed).toHaveBeenCalledWith("test-api-key");
    expect(result).toBe(false);
  });

  it("should handle different API keys", () => {
    vi.mocked(apiKeyRateLimiter.isAllowed).mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(checkApiKeyRateLimit("key1")).toBe(true);
    expect(checkApiKeyRateLimit("key2")).toBe(false);

    expect(apiKeyRateLimiter.isAllowed).toHaveBeenNthCalledWith(1, "key1");
    expect(apiKeyRateLimiter.isAllowed).toHaveBeenNthCalledWith(2, "key2");
  });
});
