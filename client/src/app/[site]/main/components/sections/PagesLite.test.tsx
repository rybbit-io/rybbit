import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/lib/store";
import { PagesLite } from "./PagesLite";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), configured: true, loading: false }));
vi.mock("@/api/utils", async original => ({
  ...(await original<typeof import("@/api/utils")>()),
  authedFetch: mocks.fetch,
}));
vi.mock("next-intl", () => ({ useExtracted: () => (text: string) => text }));
vi.mock("@/api/admin/hooks/useSites", () => ({ useGetSite: () => ({ data: { domain: "example.test" } }) }));
vi.mock("@/lib/configs", () => ({
  useConfigs: () => ({ configs: { routeGroups: mocks.configured }, isLoading: mocks.loading }),
}));
// URL tab remains the existing component; assert it never mounts on long-range
// entry, rather than mocking the shared tabs which enforce lazy mounting.
vi.mock("@/app/[site]/components/shared/StandardSection/StandardSection", () => ({
  StandardSection: () => <div>Individual URL list</div>,
}));
vi.mock("@/app/[site]/components/shared/StandardSection/StandardSectionDialog", () => ({
  StandardSectionDialogBody: () => null,
}));
let client: QueryClient;
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  mocks.fetch.mockReset();
  mocks.configured = true;
  mocks.loading = false;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useStore.setState({
    site: "1",
    time: { mode: "range", startDate: "2026-01-01", endDate: "2026-01-31" },
    timezone: "UTC",
    filters: [],
  });
  mocks.fetch.mockImplementation(async (_path: string, params: Record<string, unknown>) => ({
    data: {
      data: [
        {
          value: params.route_group ? "/summoners/na/alice" : "/summoners/:region/:player",
          hostname: "example.test",
          count: 42,
          percentage: 100,
        },
      ],
      totalCount: 1,
    },
  }));
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});
const view = () => (
  <QueryClientProvider client={client}>
    <PagesLite />
  </QueryClientProvider>
);
describe("long-range Top Pages", () => {
  it("loads route groups by default without mounting the URL list", async () => {
    render(view());
    await screen.findByRole("button", { name: /\/summoners\/:region\/:player/ });
    expect(screen.queryByText("Individual URL list")).toBeNull();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0][0]).toBe("/sites/1/route-groups");
  });
  it("drills into actual URLs without adding a literal route-template filter", async () => {
    render(view());
    fireEvent.click(await screen.findByRole("button", { name: /\/summoners\/:region\/:player/ }));
    await screen.findByText("/summoners/na/alice");
    expect(useStore.getState().filters).toEqual([]);
    expect(screen.getByRole("link").getAttribute("href")).toBe("https://example.test/summoners/na/alice");
    expect(mocks.fetch.mock.calls[1][1].route_group).toBe("/summoners/:region/:player");
    fireEvent.click(screen.getByRole("button", { name: "Route groups" }));
    await screen.findByRole("button", { name: /\/summoners\/:region\/:player/ });
  });
  it("keeps the normal URL view for short periods and unconfigured deployments", () => {
    useStore.setState({ time: { mode: "day", day: "2026-01-01" } });
    const rendered = render(view());
    expect(screen.getByText("Individual URL list")).toBeTruthy();
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.configured = false;
    useStore.setState({ time: { mode: "all-time" } });
    rendered.rerender(view());
    expect(screen.getByText("Individual URL list")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Route groups" })).toBeNull();
  });
  it("waits for configuration before starting an expensive query", async () => {
    mocks.loading = true;
    const rendered = render(view());
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Individual URL list")).toBeNull();
    mocks.loading = false;
    rendered.rerender(view());
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  });
});
