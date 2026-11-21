import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetSessionsResponse } from "@/api/analytics/endpoints";

import { useTimelineStore } from "../../../timelineStore";
import { useTimelineSessions } from "./useTimelineSessions";

const mocks = vi.hoisted(() => ({
  site: "1",
  fetchAnalytics: vi.fn<(site: string) => Promise<unknown>>(),
}));

vi.mock("@/api/analytics/useAnalyticsQuery", () => ({
  useAnalyticsContext: () => ({ site: mocks.site, context: { timeZone: "UTC" } }),
}));

vi.mock("@/api/analytics/analyticsRequest", () => ({
  buildAnalyticsRequest: () => ({ path: "sessions", params: {} }),
  fetchAnalytics: (site: string) => mocks.fetchAnalytics(site),
}));

vi.mock("@/lib/store", () => ({ getFilteredFilters: () => [] }));

const sessions = [
  { session_id: "a", session_start: "2026-10-24 10:00:00", session_end: "2026-10-24 10:05:00" },
  { session_id: "b", session_start: "2026-10-24 11:00:00", session_end: "2026-10-24 11:30:00" },
] as unknown as GetSessionsResponse;

function renderTimeline() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useTimelineSessions(), { wrapper });
}

beforeEach(() => {
  mocks.site = "1";
  mocks.fetchAnalytics.mockReset();
  useTimelineStore.getState().reset();
});

afterEach(() => {
  cleanup();
});

describe("useTimelineSessions", () => {
  it("does not keep the previous site's sessions when the next site has none", async () => {
    mocks.fetchAnalytics.mockImplementation(async site => (site === "1" ? sessions : []));
    const { rerender } = renderTimeline();
    await waitFor(() => expect(useTimelineStore.getState().allSessions).toHaveLength(2));
    expect(useTimelineStore.getState().timeRange).not.toBeNull();

    mocks.site = "2";
    rerender();
    await waitFor(() => expect(mocks.fetchAnalytics).toHaveBeenCalledWith("2"));
    await waitFor(() => expect(useTimelineStore.getState().isLoading).toBe(false));

    const state = useTimelineStore.getState();
    expect(state.allSessions).toHaveLength(0);
    expect(state.timeRange).toBeNull();
    expect(state.currentTime).toBeNull();
  });

  it("clears the old sessions while the next site loads", async () => {
    let resolveNext: (value: unknown) => void = () => {};
    mocks.fetchAnalytics.mockImplementation(site =>
      site === "1" ? Promise.resolve(sessions) : new Promise(resolve => (resolveNext = resolve))
    );
    const { rerender } = renderTimeline();
    await waitFor(() => expect(useTimelineStore.getState().allSessions).toHaveLength(2));

    mocks.site = "2";
    rerender();
    await waitFor(() => expect(useTimelineStore.getState().isLoading).toBe(true));
    expect(useTimelineStore.getState().allSessions).toHaveLength(0);

    resolveNext(sessions.slice(0, 1));
    await waitFor(() => expect(useTimelineStore.getState().allSessions).toHaveLength(1));
  });
});
