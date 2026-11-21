import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteResponse } from "@/api/admin/endpoints";

const mocks = vi.hoisted(() => ({
  updateSiteConfig: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@/api/admin/endpoints", () => ({ updateSiteConfig: mocks.updateSiteConfig }));
vi.mock("@/api/admin/hooks/useSites", () => ({ useGetSitesFromOrg: () => ({ refetch: mocks.refetch }) }));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: { planName: "pro" }, isLoading: false }),
}));
vi.mock("@/components/ui/sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { TrackingTab } from "./TrackingTab";

function renderTracking(overrides: Partial<SiteResponse> = {}, disabled = false) {
  const siteMetadata = { siteId: 17571, type: "web", organizationId: "org_1", ...overrides } as SiteResponse;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TrackingTab siteMetadata={siteMetadata} disabled={disabled} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateSiteConfig.mockResolvedValue({ success: true });
});
afterEach(cleanup);

describe("URL fragment tracking setting", () => {
  it("defaults off and saves the site setting when enabled", async () => {
    renderTracking();
    const toggle = screen.getByRole("switch", { name: "Track URL fragments" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.updateSiteConfig).toHaveBeenCalledWith(17571, { trackUrlFragments: true }));
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("true"));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("shows a saved value and lets the user turn it off", async () => {
    renderTracking({ trackUrlFragments: true });
    const toggle = screen.getByRole("switch", { name: "Track URL fragments" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.updateSiteConfig).toHaveBeenCalledWith(17571, { trackUrlFragments: false }));
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("false"));
  });

  it("respects read-only access", () => {
    renderTracking({}, true);
    expect((screen.getByRole("switch", { name: "Track URL fragments" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("hides the browser-only setting for mobile sites", () => {
    renderTracking({ type: "mobile" });
    expect(screen.queryByRole("switch", { name: "Track URL fragments" })).toBeNull();
  });
});
