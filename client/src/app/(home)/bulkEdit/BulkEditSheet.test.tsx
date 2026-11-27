import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchSitesFromOrg: vi.fn(),
  updateSiteConfig: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@/api/admin/endpoints", () => ({
  fetchSitesFromOrg: mocks.fetchSitesFromOrg,
  updateSiteConfig: mocks.updateSiteConfig,
}));
vi.mock("@/lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: { planName: "pro" }, isLoading: false }),
}));
vi.mock("@/components/ui/sonner", () => ({ toast: mocks.toast }));

import { BulkEditSheet } from "./BulkEditSheet";
import type { BulkSite } from "./bulkEditPlan";

const site = (siteId: number, overrides: Partial<BulkSite> = {}) =>
  ({ siteId, name: `site-${siteId}.com`, type: "web", ...overrides }) as BulkSite;

const sites = [site(1, { sessionReplay: true }), site(2), site(3)];
const onApplied = vi.fn();
const onOpenChange = vi.fn();

function renderSheet() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <BulkEditSheet open onOpenChange={onOpenChange} organizationId="org_1" sites={sites} onApplied={onApplied} />
    </QueryClientProvider>
  );
}

const choose = (setting: string, option: string) =>
  fireEvent.click(within(screen.getByRole("radiogroup", { name: setting })).getByRole("radio", { name: option }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchSitesFromOrg.mockResolvedValue({ sites });
  mocks.updateSiteConfig.mockResolvedValue({ success: true });
});
afterEach(cleanup);

describe("BulkEditSheet", () => {
  it("can't be reviewed until a choice would change a site", () => {
    renderSheet();
    const review = screen.getByRole("button", { name: "Review changes" }) as HTMLButtonElement;
    expect(review.disabled).toBe(true);

    // Outbound link tracking is already on everywhere.
    choose("Outbound Links", "On");
    expect(review.disabled).toBe(true);

    choose("Session Replay", "On");
    expect(review.disabled).toBe(false);
  });

  it("updates only the sites that change, with only the changed settings", async () => {
    renderSheet();
    choose("Session Replay", "On");
    choose("Outbound Links", "On");
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));

    expect(screen.getByText("site-2.com")).toBeTruthy();
    expect(screen.queryByText("site-1.com")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Apply to/ }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
    expect(mocks.fetchSitesFromOrg).toHaveBeenCalledWith("org_1");
    expect(mocks.updateSiteConfig.mock.calls).toEqual([
      [2, { sessionReplay: true }],
      [3, { sessionReplay: true }],
    ]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.toast.success).toHaveBeenCalledOnce();
  });

  it("plans from the sites as they are when applying", async () => {
    // Someone turned replay on for site 2 while the sheet was open.
    mocks.fetchSitesFromOrg.mockResolvedValue({ sites: [sites[0], site(2, { sessionReplay: true }), sites[2]] });
    renderSheet();
    choose("Session Replay", "On");
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    fireEvent.click(screen.getByRole("button", { name: /Apply to/ }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
    expect(mocks.updateSiteConfig.mock.calls).toEqual([[3, { sessionReplay: true }]]);
  });

  it("adds list entries typed into the input", async () => {
    renderSheet();
    choose("IP Exclusions", "Add");
    const input = screen.getByRole("textbox", { name: "Entries for {setting}" });
    fireEvent.change(input, { target: { value: "not-an-ip" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Not a valid IP address, CIDR block or IPv4 range")).toBeTruthy();

    fireEvent.change(input, { target: { value: "203.0.113.0/24" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    fireEvent.click(screen.getByRole("button", { name: /Apply to/ }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
    expect(mocks.updateSiteConfig).toHaveBeenCalledTimes(3);
    expect(mocks.updateSiteConfig).toHaveBeenCalledWith(2, { excludedIPs: ["203.0.113.0/24"] });
  });

  it("lists the sites that failed and retries only those", async () => {
    mocks.updateSiteConfig.mockImplementation(async (siteId: number) => {
      if (siteId === 3) throw new Error("Session replay requires a Pro plan");
    });
    renderSheet();
    choose("Session Replay", "On");
    fireEvent.click(screen.getByRole("button", { name: "Review changes" }));
    fireEvent.click(screen.getByRole("button", { name: /Apply to/ }));

    expect(await screen.findByText("Session replay requires a Pro plan")).toBeTruthy();
    expect(screen.getByText("site-3.com")).toBeTruthy();
    expect(onApplied).not.toHaveBeenCalled();

    mocks.updateSiteConfig.mockResolvedValue({ success: true });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
    expect(mocks.updateSiteConfig).toHaveBeenLastCalledWith(3, { sessionReplay: true });
    expect(mocks.updateSiteConfig).toHaveBeenCalledTimes(3);
  });
});
