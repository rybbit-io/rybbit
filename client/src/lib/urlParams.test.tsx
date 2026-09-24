import { act, cleanup, render, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter, UrlUpdateEvent } from "nuqs/adapters/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPARISON } from "../components/DateSelector/types";
import { useStore } from "./store";
import { useSyncStateWithUrl } from "./urlParams";

const navigation = vi.hoisted(() => ({ pathname: "/", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

function Sync() {
  useSyncStateWithUrl();
  return null;
}

const onUrlUpdate = vi.fn(({ queryString }: UrlUpdateEvent) => {
  navigation.search = queryString;
});

function mount(search = "", pathname = "/") {
  navigation.pathname = pathname;
  navigation.search = search;
  return render(
    <NuqsTestingAdapter searchParams={search} onUrlUpdate={onUrlUpdate} hasMemory>
      <Sync />
    </NuqsTestingAdapter>
  );
}

beforeEach(() => {
  localStorage.clear();
  onUrlUpdate.mockClear();
  useStore.setState({
    site: "",
    privateKey: null,
    time: { mode: "day", day: "2026-09-21" },
    previousTime: { mode: "day", day: "2026-09-20" },
    comparison: DEFAULT_COMPARISON,
    bucket: "hour",
    selectedStat: "users",
    filters: [],
    segmentId: null,
    timezone: "UTC",
  });
});
afterEach(cleanup);

describe("homepage time URL persistence", () => {
  it("restores a rolling window and comparison without a selected Site", async () => {
    mount("?timeMode=past-minutes&past_minutes_start=30&past_minutes_end=0&compare=none&bucket=minute");
    await waitFor(() =>
      expect(useStore.getState()).toMatchObject({
        time: { mode: "past-minutes", pastMinutesStart: 30, pastMinutesEnd: 0 },
        comparison: { mode: "none" },
        previousTime: null,
        bucket: "minute",
      })
    );
  });

  it("writes changed time filters and restores them after a refresh", async () => {
    const view = mount();
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const time = {
      mode: "range" as const,
      startDate: "2026-09-18",
      endDate: "2026-09-19",
      startTime: "10:30",
      endTime: "14:45",
    };
    act(() => {
      useStore.getState().setTime(time);
      useStore.getState().setComparison({ mode: "none" });
    });
    await waitFor(() => {
      const params = new URLSearchParams(navigation.search);
      expect(params.get("timeMode")).toBe("range");
      expect(params.get("startTime")).toBe("10:30");
      expect(params.get("endTime")).toBe("14:45");
      expect(params.get("compare")).toBe("none");
    });
    const savedSearch = navigation.search;
    view.unmount();
    useStore.getState().setTime({ mode: "all-time" });
    useStore.getState().setComparison(DEFAULT_COMPARISON);
    mount(savedSearch);
    await waitFor(() => {
      expect(useStore.getState().time).toEqual(time);
      expect(useStore.getState().previousTime).toBeNull();
    });
  });

  it("restores the homepage URL after visiting a Site without copying its dimension filters", async () => {
    useStore.setState({
      site: "42",
      selectedStat: "bounce_rate",
      filters: [{ parameter: "country", type: "equals", value: ["US"] }],
      segmentId: 7,
    });
    mount("?wellKnown=last-30-minutes&campaign=kept");
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(useStore.getState().time).toMatchObject({ mode: "past-minutes", pastMinutesStart: 30 });
    const params = new URLSearchParams(navigation.search);
    expect(params.get("wellKnown")).toBe("last-30-minutes");
    expect(params.get("campaign")).toBe("kept");
    for (const key of ["stat", "filters", "segment"]) expect(params.has(key)).toBe(false);
  });

  it("still waits for the correct Site context on Site dashboards", async () => {
    mount("?timeMode=past-minutes&past_minutes_start=60&past_minutes_end=0", "/42/main");
    expect(onUrlUpdate).not.toHaveBeenCalled();
    expect(useStore.getState().time.mode).toBe("day");
    act(() => useStore.setState({ site: "42" }));
    await waitFor(() => expect(useStore.getState().time).toMatchObject({ pastMinutesStart: 60 }));
  });
});
