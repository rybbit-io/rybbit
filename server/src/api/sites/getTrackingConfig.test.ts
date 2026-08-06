import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  hasFeatureFlagsForRuntime: vi.fn(),
  isSiteWithoutReplay: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: { getConfig: mocks.getConfig },
}));

vi.mock("../../services/featureFlags/definitions.js", () => ({
  hasFeatureFlagsForRuntime: mocks.hasFeatureFlagsForRuntime,
}));

vi.mock("../../services/usageService.js", () => ({
  usageService: { isSiteWithoutReplay: mocks.isSiteWithoutReplay },
}));

import { getTrackingConfig } from "./getTrackingConfig.js";

describe("getTrackingConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockResolvedValue({
      siteId: 123,
      type: "web",
      sessionReplay: false,
      webVitals: false,
      trackErrors: false,
      trackOutbound: true,
      trackUrlParams: true,
      trackInitialPageView: true,
      trackSpaNavigation: true,
      trackButtonClicks: false,
      trackCopy: false,
      trackFormInteractions: false,
    });
    mocks.hasFeatureFlagsForRuntime.mockResolvedValue(false);
    mocks.isSiteWithoutReplay.mockReturnValue(false);
  });

  it("tells the tracking script to skip evaluation when a site has no flags", async () => {
    const request = { params: { siteId: "123" }, log: { error: vi.fn() } } as any;
    const reply = { send: vi.fn(), status: vi.fn().mockReturnThis() } as any;

    await getTrackingConfig(request, reply);

    expect(mocks.hasFeatureFlagsForRuntime).toHaveBeenCalledWith(123, "client");
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ featureFlagsEnabled: false }));
  });
});
