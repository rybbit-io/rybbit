import { describe, it, expect, vi, beforeEach } from "vitest";

// Define the expected site config type to match SiteConfigData
interface SiteConfigData {
  id: number;
  domain: string;
  apiKey?: string;
  public: boolean;
  saltUserIds: boolean;
  blockBots: boolean;
  excludedIPs: string[];
}

// Mock dependencies
vi.mock("../../lib/rateLimiter.js", () => ({
  apiKeyRateLimiter: {
    isAllowed: vi.fn(),
  },
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: {
    ensureInitialized: vi.fn(),
    getSiteConfig: vi.fn(),
  },
}));

vi.mock("../../utils.js", () => ({
  normalizeOrigin: vi.fn(),
}));

import { validateApiKey, validateOrigin, checkApiKeyRateLimit } from "./requestValidation.js";

// Import mocked modules
import { apiKeyRateLimiter } from "../../lib/rateLimiter.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { normalizeOrigin } from "../../utils.js";

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
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(undefined);

    const result = await validateApiKey(1, "test-api-key");

    expect(siteConfig.ensureInitialized).toHaveBeenCalled();
    expect(siteConfig.getSiteConfig).toHaveBeenCalledWith(1);
    expect(result).toEqual({ success: false, error: "Site not found" });
  });

  it("should return success true when API key matches", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      apiKey: "valid-api-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);

    // Mock console.info to avoid output during tests
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await validateApiKey(1, "valid-api-key");

    expect(result).toEqual({ success: true });
    expect(consoleSpy).toHaveBeenCalledWith("[Validation] Valid API key for site 1");

    consoleSpy.mockRestore();
  });

  it("should return success false when API key does not match", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      apiKey: "valid-api-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);

    const result = await validateApiKey(1, "invalid-api-key");

    expect(result).toEqual({ success: false, error: "Invalid API key" });
  });

  it("should handle string siteId by converting to number", async () => {
    const mockSite: SiteConfigData = {
      id: 123,
      apiKey: "test-key",
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);

    await validateApiKey("123", "test-key");

    expect(siteConfig.getSiteConfig).toHaveBeenCalledWith(123);
  });

  it("should handle site with no API key configured", async () => {
    const mockSite: Partial<SiteConfigData> &
      Pick<SiteConfigData, "id" | "domain" | "public" | "saltUserIds" | "blockBots"> = {
      id: 1,
      domain: "example.com",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    }; // No apiKey property
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite as SiteConfigData);

    const result = await validateApiKey(1, "any-key");

    expect(result).toEqual({ success: false, error: "Invalid API key" });
  });

  it("should handle errors during validation", async () => {
    vi.mocked(siteConfig.ensureInitialized).mockRejectedValue(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await validateApiKey(1, "test-key");

    expect(result).toEqual({ success: false, error: "Failed to validate API key" });
    expect(consoleSpy).toHaveBeenCalledWith("Error validating API key:", expect.any(Error));

    consoleSpy.mockRestore();
  });
});

describe("validateOrigin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("should return success true when origin checking is disabled", async () => {
    // Set environment variable before any imports happen
    vi.stubEnv("DISABLE_ORIGIN_CHECK", "true");

    // Re-import the module to pick up the new environment variable
    await vi.resetModules();

    // Re-establish the mocks after reset
    vi.doMock("../../lib/siteConfig.js", () => ({
      siteConfig: {
        ensureInitialized: vi.fn(),
        getSiteConfig: vi.fn(),
      },
    }));

    vi.doMock("../../utils.js", () => ({
      normalizeOrigin: vi.fn(),
    }));

    const { validateOrigin } = await import("./requestValidation.js");

    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await validateOrigin(1, "https://example.com");

    expect(result).toEqual({ success: true });
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Validation] Origin check disabled. Allowing request for site 1 from origin: https://example.com",
    );

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("should return success false when site is not found", async () => {
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(undefined);

    const result = await validateOrigin(1, "https://example.com");

    expect(result).toEqual({ success: false, error: "Site not found" });
  });

  it("should return success false when no origin header is provided", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      domain: "example.com",
      apiKey: "test-key",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);

    const result = await validateOrigin(1);

    expect(result).toEqual({ success: false, error: "Origin header required" });
  });

  it("should return success true for exact domain match", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      domain: "example.com",
      apiKey: "test-key",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);
    vi.mocked(normalizeOrigin)
      .mockReturnValueOnce("example.com") // for request origin
      .mockReturnValueOnce("example.com"); // for site domain

    const result = await validateOrigin(1, "https://example.com");

    expect(normalizeOrigin).toHaveBeenCalledWith("https://example.com");
    expect(normalizeOrigin).toHaveBeenCalledWith("https://example.com");
    expect(result).toEqual({ success: true });
  });

  it("should return success true for subdomain (always allowed)", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      domain: "example.com",
      apiKey: "test-key",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);
    vi.mocked(normalizeOrigin)
      .mockReturnValueOnce("sub.example.com") // for request origin
      .mockReturnValueOnce("example.com"); // for site domain

    const result = await validateOrigin(1, "https://sub.example.com");

    expect(result).toEqual({ success: true });
  });

  it("should return success true for nested subdomain", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      domain: "example.com",
      apiKey: "test-key",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);
    vi.mocked(normalizeOrigin)
      .mockReturnValueOnce("deep.nested.sub.example.com") // for request origin
      .mockReturnValueOnce("example.com"); // for site domain

    const result = await validateOrigin(1, "https://deep.nested.sub.example.com");

    expect(result).toEqual({ success: true });
  });

  it("should return success false for different domain", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      domain: "example.com",
      apiKey: "test-key",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);
    vi.mocked(normalizeOrigin)
      .mockReturnValueOnce("different.com") // for request origin
      .mockReturnValueOnce("example.com"); // for site domain

    const result = await validateOrigin(1, "https://different.com");

    expect(result).toEqual({
      success: false,
      error: "Origin mismatch. Received: https://different.com",
    });
  });

  it("should return success false for domain that contains site domain but is not a subdomain", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      domain: "example.com",
      apiKey: "test-key",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);
    vi.mocked(normalizeOrigin)
      .mockReturnValueOnce("notexample.com") // for request origin
      .mockReturnValueOnce("example.com"); // for site domain

    const result = await validateOrigin(1, "https://notexample.com");

    expect(result).toEqual({
      success: false,
      error: "Origin mismatch. Received: https://notexample.com",
    });
  });

  it("should handle string siteId by converting to number", async () => {
    const mockSite: SiteConfigData = {
      id: 123,
      domain: "example.com",
      apiKey: "test-key",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);

    await validateOrigin("123", "https://example.com");

    expect(siteConfig.getSiteConfig).toHaveBeenCalledWith(123);
  });

  it("should handle invalid origin format", async () => {
    const mockSite: SiteConfigData = {
      id: 1,
      domain: "example.com",
      apiKey: "test-key",
      public: true,
      saltUserIds: false,
      blockBots: true,
      excludedIPs: [],
    };
    vi.mocked(siteConfig.ensureInitialized).mockResolvedValue(undefined);
    vi.mocked(siteConfig.getSiteConfig).mockResolvedValue(mockSite);
    vi.mocked(normalizeOrigin).mockImplementation(() => {
      throw new Error("Invalid URL");
    });

    const result = await validateOrigin(1, "invalid-origin");

    expect(result).toEqual({
      success: false,
      error: "Invalid origin format: invalid-origin",
    });
  });

  it("should handle errors during validation", async () => {
    vi.mocked(siteConfig.ensureInitialized).mockRejectedValue(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await validateOrigin(1, "https://example.com");

    expect(result).toEqual({ success: false, error: "Internal error validating origin" });
    expect(consoleSpy).toHaveBeenCalledWith("Error validating origin:", expect.any(Error));

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
