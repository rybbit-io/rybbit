import { beforeEach, describe, expect, it, vi } from "vitest";

// Define the expected site config type to match SiteConfigData
interface SiteConfigData {
  id: string;
  siteId: number;
  organizationId: string | null;
  domain: string;
  apiKey?: string | null;
  public: boolean;
  saltUserIds: boolean;
  blockBots: boolean;
  excludedIPs: string[];
  sessionReplay: boolean;
  webVitals: boolean;
  trackErrors: boolean;
  trackOutbound: boolean;
  trackUrlParams: boolean;
  trackInitialPageView: boolean;
  trackSpaNavigation: boolean;
  trackIp: boolean;
}

const {
  rateLimiterMock,
  siteConfigMock,
  loggerInfoMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  rateLimiterMock: {
    isAllowed: vi.fn(),
  },
  siteConfigMock: {
    getConfig: vi.fn(),
  },
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({
    info: loggerInfoMock,
    error: loggerErrorMock,
  }),
}));

// Mock dependencies
vi.mock("../../lib/rateLimiter.js", () => ({
  apiKeyRateLimiter: rateLimiterMock,
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: siteConfigMock,
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
      organizationId: "test-org-id",
      apiKey: "valid-api-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
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

    const result = await validateApiKey(1, "valid-api-key");

    expect(result).toEqual({ success: true });
    expect(loggerInfoMock).toHaveBeenCalledWith({ siteId: 1 }, "Valid API key for site");
  });

  it("should return success false when API key does not match", async () => {
    const mockSite: SiteConfigData = {
      id: "test-id",
      siteId: 1,
      organizationId: "test-org-id",
      apiKey: "valid-api-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
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
      organizationId: "test-org-id",
      apiKey: "test-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
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
        | "organizationId"
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
      organizationId: "test-org-id",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
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

    const result = await validateApiKey(1, "test-key");

    expect(result).toEqual({ success: false, error: "Failed to validate API key" });
    expect(loggerErrorMock).toHaveBeenCalledWith(expect.any(Error), "Error validating API key");
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
