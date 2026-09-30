import type { Filter } from "@rybbit/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useStore } from "@/lib/store";
import { useGetSiteEventCount } from "./hooks/events/useGetSiteEventCount";
import { useGetFunnelStepSessions } from "./hooks/funnels/useGetFunnelStepSessions";
import { useGetGoalTimeSeries } from "./hooks/goals/useGetGoalTimeSeries";
import { useGetGoals } from "./hooks/goals/useGetGoals";
import { usePaginatedMetric } from "./hooks/useGetMetric";
import { useAnalyticsQuery } from "./useAnalyticsQuery";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../utils", async original => ({ ...(await original<object>()), authedFetch: mocks.fetch }));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mocks.fetch.mockResolvedValue({ data: [], totalCount: 0 });
  useStore.setState({
    site: "7",
    filters: [],
    time: { mode: "day", day: "2026-09-01" },
    previousTime: null,
    timezone: "UTC",
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.clearAllMocks();
});

describe("analytics query enablement", () => {
  it("cannot enable a missing previous period through props", async () => {
    const { result } = renderHook(
      () =>
        useAnalyticsQuery({ key: "previous-test", path: "overview", periodTime: "previous", props: { enabled: true } }),
      { wrapper }
    );
    await act(async () => {});
    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("keeps caller enabled callbacks and explicit false flags", async () => {
    const enabled = vi.fn(() => false);
    renderHook(() => useAnalyticsQuery({ key: "disabled-test", path: "overview", props: { enabled } }), { wrapper });
    await act(async () => {});
    expect(enabled).toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("honors paginated metrics enabled=false until enabled", async () => {
    const { rerender } = renderHook(({ enabled }) => usePaginatedMetric({ parameter: "browser", enabled }), {
      wrapper,
      initialProps: { enabled: false },
    });
    await act(async () => {});
    expect(mocks.fetch).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  });
});

describe.each([
  { name: "event count", hook: () => useGetSiteEventCount() },
  { name: "goal series", hook: () => useGetGoalTimeSeries({ goalIds: [1] }) },
  { name: "goals", hook: () => useGetGoals({}) },
  {
    name: "funnel sessions",
    hook: () =>
      useGetFunnelStepSessions({
        siteId: 7,
        steps: [
          { type: "page", value: "/" },
          { type: "page", value: "/done" },
        ],
        stepNumber: 1,
        time: { mode: "day", day: "2026-09-01" },
        mode: "reached",
        enabled: true,
      }),
  },
])("reactive $name filters", ({ hook }) => {
  it("refetches when the store filter changes", async () => {
    renderHook(
      () => {
        hook();
      },
      { wrapper }
    );
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
    const filter: Filter = { parameter: "country", type: "equals", value: ["US"] };
    act(() => useStore.getState().setFilters([filter]));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.fetch.mock.calls[1][1].filters).toEqual([filter]);
  });
});
