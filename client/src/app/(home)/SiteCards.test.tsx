import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/lib/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteCards } from "./SiteCards";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), inView: true, lite: true }));
vi.mock("@/api/utils", async importOriginal => ({
  ...(await importOriginal<typeof import("@/api/utils")>()),
  authedFetch: mocks.fetch,
}));
vi.mock("@/lib/const", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/const")>()),
  get LITE_DASHBOARD() {
    return mocks.lite;
  },
}));
vi.mock("next-intl", () => ({ useExtracted: () => (text: string) => text }));
vi.mock("@/hooks/useInView", () => ({ useInView: () => ({ ref: undefined, isInView: mocks.inView }) }));
vi.mock("@/components/Favicon", () => ({ Favicon: () => null }));
vi.mock("@/components/SiteSettings/SiteSettings", () => ({ SiteSettings: () => null }));
vi.mock("@/components/TagEditor", () => ({ TagEditor: () => null }));
vi.mock("@/components/SiteSessionChart", () => ({ SiteSessionChart: () => <div data-testid="chart" /> }));
vi.mock("@/app/[site]/main/components/MainSection/Overview", () => ({ ChangePercentage: () => <span>change</span> }));

const sites = Array.from({ length: 20 }, (_, i) => ({ siteId: i + 1, name: `Site ${i + 1}`, domain: "example.com" }));
let client: QueryClient;

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.inView = true;
  mocks.lite = true;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useStore.setState({
    site: "",
    time: { mode: "past-minutes", pastMinutesStart: 1440, pastMinutesEnd: 0 },
    previousTime: { mode: "past-minutes", pastMinutesStart: 2880, pastMinutesEnd: 1440 },
    bucket: "hour",
    timezone: "America/New_York",
    filters: [{ parameter: "country", type: "equals", value: ["CA"] }],
  });
  mocks.fetch.mockImplementation(
    async (path: string, _params: unknown, config?: { data: { siteIds: number[]; comparison: unknown } }) => {
      if (path.endsWith("/site-cards-lite") || path.endsWith("/site-cards")) {
        return {
          data: Object.fromEntries(
            config!.data.siteIds.map(siteId => [
              siteId,
              {
                current: { sessions: 123, users: 45 },
                previous: config!.data.comparison === null ? null : { sessions: 100, users: 40 },
                series: [{ time: "2026-09-20 12:00:00", sessions: 123 }],
              },
            ])
          ),
        };
      }
      return { data: path.includes("bucketed") ? [] : { sessions: 123, users: 45 } };
    }
  );
});

afterEach(() => {
  cleanup();
  client.clear();
});

function cards(organizationId = "org-1", pageSites = sites) {
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <SiteCards organizationId={organizationId} sites={pageSites} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

describe("homepage Site cards", () => {
  it("loads 20 cards with one analytics request including both periods", async () => {
    render(cards());
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/organizations/org-1/site-cards-lite",
      {
        time_zone: "America/New_York",
        past_minutes_start: 1440,
        past_minutes_end: 0,
        bucket: "hour",
      },
      {
        method: "POST",
        data: {
          siteIds: sites.map(site => site.siteId),
          comparison: { time_zone: "America/New_York", past_minutes_start: 2880, past_minutes_end: 1440 },
        },
      }
    );
  });

  it("shows totals off screen and scrolling mounts charts without more requests", async () => {
    mocks.inView = false;
    const view = render(cards());
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    expect(screen.queryAllByTestId("chart")).toHaveLength(0);
    mocks.inView = true;
    view.rerender(cards());
    expect(screen.getAllByTestId("chart")).toHaveLength(20);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("sends no comparison window or percentages when comparison is disabled", async () => {
    render(cards());
    await waitFor(() => expect(screen.getAllByText("change")).toHaveLength(40));
    act(() => useStore.setState({ previousTime: null }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    expect(mocks.fetch.mock.lastCall![2].data.comparison).toBeNull();
    expect(screen.queryAllByText("change")).toHaveLength(0);
  });

  it("loads just the new page's sites and isolates the organization cache", async () => {
    const view = render(cards());
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    const nextSites = [{ siteId: 21, name: "Site 21", domain: "example.com" }];
    view.rerender(cards("org-1", nextSites));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.fetch.mock.lastCall![2].data.siteIds).toEqual([21]);
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(1));

    // Same site IDs, new org: an in-flight request must not display the old
    // organization's cached totals, even while a transfer is being resolved.
    mocks.fetch.mockImplementationOnce(() => new Promise(() => {}));
    view.rerender(cards("org-2", nextSites));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3));
    expect(mocks.fetch.mock.lastCall![0]).toBe("/organizations/org-2/site-cards-lite");
    expect(screen.queryAllByText("123")).toHaveLength(0);
  });

  it("keys requests by the current period, comparison, timezone and bucket", async () => {
    render(cards());
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    act(() => useStore.setState({ time: { mode: "day", day: "2026-09-18" } }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.fetch.mock.lastCall![1]).toMatchObject({ start_date: "2026-09-18", end_date: "2026-09-18" });
    act(() => useStore.setState({ previousTime: { mode: "day", day: "2025-09-18" } }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3));
    expect(mocks.fetch.mock.lastCall![2].data.comparison.start_date).toBe("2025-09-18");
    act(() => useStore.setState({ timezone: "Asia/Kolkata" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(4));
    expect(mocks.fetch.mock.lastCall![1].time_zone).toBe("Asia/Kolkata");
    act(() => useStore.setState({ bucket: "day" }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(5));
    expect(mocks.fetch.mock.lastCall![1].bucket).toBe("day");
  });

  it("reuses the batch for a reorder and ignores per-site dashboard filters", async () => {
    const view = render(cards());
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    view.rerender(cards("org-1", [...sites].reverse()));
    act(() => useStore.setState({ filters: [], site: "42" }));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it.each(["current", "previous"])("retains the existing fallback for exact %s windows", async period => {
    const range = {
      mode: "range" as const,
      startDate: "2026-09-18",
      endDate: "2026-09-18",
      startTime: "10:30",
      endTime: "12:45",
    };
    useStore.setState(period === "current" ? { time: range } : { previousTime: range });
    render(cards());
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(60));
    expect(mocks.fetch.mock.calls.every(([path]) => path.startsWith("/sites/"))).toBe(true);
    expect(mocks.fetch.mock.calls.some(([, params]) => params.start_datetime)).toBe(true);
  });

  it("batches standard deployments without using the materialized-view endpoint", async () => {
    mocks.lite = false;
    render(cards());
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.lastCall![0]).toBe("/organizations/org-1/site-cards");
    expect(mocks.fetch.mock.lastCall![2].data.siteIds).toEqual(sites.map(site => site.siteId));
  });

  it("batches exact datetime ranges with minute buckets in standard mode", async () => {
    mocks.lite = false;
    useStore.setState({
      time: { mode: "range", startDate: "2026-09-18", endDate: "2026-09-18", startTime: "10:30", endTime: "12:45" },
      previousTime: {
        mode: "range",
        startDate: "2026-09-17",
        endDate: "2026-09-17",
        startTime: "10:30",
        endTime: "12:45",
      },
      bucket: "minute",
    });
    render(cards());
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.lastCall![0]).toBe("/organizations/org-1/site-cards");
    expect(mocks.fetch.mock.lastCall![1]).toMatchObject({
      start_datetime: "2026-09-18 14:30:00",
      end_datetime: "2026-09-18 16:45:00",
      bucket: "minute",
    });
    expect(mocks.fetch.mock.lastCall![2].data.comparison).toMatchObject({
      start_datetime: "2026-09-17 14:30:00",
      end_datetime: "2026-09-17 16:45:00",
    });
  });

  it("batches all-time hourly charts in standard mode", async () => {
    mocks.lite = false;
    useStore.setState({ time: { mode: "all-time" }, previousTime: null, bucket: "hour" });
    render(cards());
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.lastCall![0]).toBe("/organizations/org-1/site-cards");
    expect(mocks.fetch.mock.lastCall![2].data.comparison).toBeNull();
  });

  it("does not reuse MV metrics for a raw-events request", async () => {
    const view = render(cards());
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    mocks.lite = false;
    mocks.fetch.mockImplementationOnce(() => new Promise(() => {}));
    view.rerender(cards());
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.fetch.mock.lastCall![0]).toBe("/organizations/org-1/site-cards");
    expect(screen.queryAllByText("123")).toHaveLength(0);
  });

  it("retains event-only buckets in unbounded hourly charts through the existing endpoint", async () => {
    useStore.setState({ time: { mode: "all-time" }, previousTime: null, bucket: "hour" });
    render(cards());
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(40));
    expect(mocks.fetch.mock.calls.every(([path]) => path.startsWith("/sites/"))).toBe(true);
  });

  it("makes no analytics request for an empty page or missing organization", () => {
    const view = render(cards("org-1", []));
    expect(mocks.fetch).not.toHaveBeenCalled();
    view.rerender(cards("", sites));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("shows an error and retries the batch without displaying zero metrics", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("ClickHouse unavailable"));
    render(cards());
    await waitFor(() => expect(screen.getByText("Failed to load data")).toBeTruthy());
    expect(screen.queryAllByText("0")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    await waitFor(() => expect(screen.getAllByText("123")).toHaveLength(20));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
