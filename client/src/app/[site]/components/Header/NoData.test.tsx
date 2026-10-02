import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionGlobalConfig } from "framer-motion";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useGetLiveUserCount } from "@/api/analytics/hooks/useGetLiveUserCount";
import { useGetSessionsInfinite } from "@/api/analytics/hooks/useGetUserSessions";
import { useStore } from "@/lib/store";
import { NoData } from "./NoData";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  hasData: false,
  live: 0,
  sessions: [] as unknown[],
}));

vi.mock("@/api/utils", async importOriginal => ({
  ...(await importOriginal<typeof import("@/api/utils")>()),
  authedFetch: mocks.fetch,
}));
vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, unknown>) =>
    message.replace(/\{(\w+)(?:, \w+)?\}/g, (_, key: string) => String(values?.[key] ?? "")),
  useLocale: () => "en",
}));
vi.mock("@/hooks/useIsWhiteLabel", () => ({ useWhiteLabel: () => ({ isWhiteLabel: false }) }));
vi.mock("@/components/CodeSnippet", () => ({ CodeSnippet: ({ code }: { code: string }) => <pre>{code}</pre> }));

// What SubHeader's LiveUserCount mounts on every dashboard page.
function LiveUserCountProbe() {
  useGetLiveUserCount(5);
  useGetSessionsInfinite({
    timeOverride: { mode: "past-minutes", pastMinutesStart: 5, pastMinutesEnd: 0 },
    limit: 25,
    refetchInterval: 10000,
  });
  return null;
}

let client: QueryClient;

const callsTo = (path: string) => mocks.fetch.mock.calls.filter(([called]) => called === path).length;
const waitingHeading = () => screen.findByRole("heading", { name: "Waiting for the first pageview from acme.dev" });
const arrivedHeading = () => screen.findByRole("heading", { name: "Now tracking acme.dev" });

// has-data's own 30 s poll (or the live-count nudge) asking again after the first pageview landed.
async function firstPageviewLands() {
  mocks.hasData = true;
  await act(() => client.invalidateQueries({ queryKey: ["site-has-data", "7"] }));
}

function show(extra?: React.ReactNode) {
  return render(
    <QueryClientProvider client={client}>
      <NoData />
      {extra}
    </QueryClientProvider>
  );
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  // framer restores the scroll position after measuring an "auto" height; jsdom has no scrollTo.
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.hasData = false;
  mocks.live = 0;
  mocks.sessions = [];
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useStore.setState({ site: "7", timezone: "UTC", filters: [] });
  mocks.fetch.mockImplementation(async (path: string) => {
    if (path === "/sites/7/has-data") return { hasData: mocks.hasData };
    if (path === "/sites/7") return { id: null, siteId: 7, name: "acme.dev", domain: "acme.dev", type: "web" };
    if (path === "/sites/7/live-user-count") return { count: mocks.live };
    if (path === "/sites/7/sessions") return { data: mocks.sessions };
    return { data: [] };
  });
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
});

describe("NoData", () => {
  it("shows the install card while the site has no data", async () => {
    show();

    expect(await waitingHeading()).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("stays out of the way when the site already had data on load", async () => {
    mocks.hasData = true;
    show();

    await waitFor(() => expect(client.getQueryData(["site-has-data", "7"])).toBe(true));
    await waitFor(() => expect(client.getQueryData(["get-site", "7"])).toBeTruthy());
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("turns into a confirmation when has-data flips during the visit, and announces it once", async () => {
    show();
    await waitingHeading();

    await firstPageviewLands();

    expect(await arrivedHeading()).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("First pageview received");
    await waitFor(() => expect(screen.queryByRole("heading", { name: /Waiting/ })).toBeNull());
  });

  it("asks has-data again as soon as the live count LiveUserCount polls sees a visitor", async () => {
    show(<LiveUserCountProbe />);
    await waitingHeading();
    await waitFor(() => expect(callsTo("/sites/7/live-user-count")).toBe(1));

    // NoData only listens to the cache: the query keeps LiveUserCount's single observer and interval.
    const liveQueries = client.getQueryCache().findAll({ queryKey: ["live-user-count"] });
    expect(liveQueries).toHaveLength(1);
    expect(liveQueries[0].getObserversCount()).toBe(1);

    const before = callsTo("/sites/7/has-data");
    await act(() => client.refetchQueries({ queryKey: ["live-user-count", "7"] }));
    expect(callsTo("/sites/7/has-data")).toBe(before);

    mocks.live = 1;
    mocks.hasData = true;
    await act(() => client.refetchQueries({ queryKey: ["live-user-count", "7"] }));

    expect(await arrivedHeading()).toBeTruthy();
    expect(callsTo("/sites/7/has-data")).toBe(before + 1);
  });

  it("refreshes this site's analytics queries once the morph has settled, then ticks the dashboard step", async () => {
    show(<LiveUserCountProbe />);
    await waitingHeading();
    const params = { time_zone: "UTC" };
    client.setQueryData(["overview", "7", "overview", params, undefined], { sessions: 0 });
    client.setQueryData(["overview", "8", "overview", params, undefined], { sessions: 0 });
    const liveBefore = callsTo("/sites/7/live-user-count");
    const sessionsBefore = callsTo("/sites/7/sessions");

    await firstPageviewLands();
    await arrivedHeading();

    // Nothing refetches during the swap: the dashboard's re-renders would stall the height spring.
    expect(callsTo("/sites/7/live-user-count")).toBe(liveBefore);
    const step = screen.getByText("Your dashboard is filling in").closest("li")!;
    expect(step.textContent).toContain("In progress:");

    // Then real useAnalyticsQuery keys on screen refetch; off-screen ones are only marked stale.
    await waitFor(() => expect(callsTo("/sites/7/live-user-count")).toBe(liveBefore + 1), { timeout: 2000 });
    expect(callsTo("/sites/7/sessions")).toBe(sessionsBefore + 1);
    expect(client.getQueryState(["overview", "7", "overview", params, undefined])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["overview", "8", "overview", params, undefined])?.isInvalidated).toBe(false);
    expect(client.getQueryState(["get-site", "7"])?.isInvalidated).toBe(false);
    await waitFor(() => expect(step.textContent).toContain("Done:"), { timeout: 2000 });
  });

  it("still refreshes the dashboard straight away when the confirmation is dismissed early", async () => {
    show(<LiveUserCountProbe />);
    await waitingHeading();
    const liveBefore = callsTo("/sites/7/live-user-count");

    await firstPageviewLands();
    await arrivedHeading();
    fireEvent.click(screen.getByRole("button", { name: "Explore your dashboard" }));

    // Well inside ARRIVAL_REFRESH_DELAY_MS: the dismissal itself started the refetch.
    await waitFor(() => expect(callsTo("/sites/7/live-user-count")).toBe(liveBefore + 1), { timeout: 300 });
  });

  it("lets the install card finish fading out before the confirmation mounts", async () => {
    // A real 0.14 s exit, so there is a window to look into (skipped animations end on the next frame).
    MotionGlobalConfig.skipAnimations = false;
    try {
      show();
      await waitingHeading();

      await firstPageviewLands();
      // The commit that announces the arrival is the one that starts the install card's exit.
      await waitFor(() => expect(screen.getByRole("status").textContent).toBe("First pageview received"));

      // Mid-exit: the install card is still laid out (and inert); the confirmation isn't mounted yet.
      expect(screen.getByText("Waiting for the first pageview from acme.dev")).toBeTruthy();
      expect(screen.queryByText("Now tracking acme.dev")).toBeNull();

      await arrivedHeading();
      expect(screen.queryByText("Waiting for the first pageview from acme.dev")).toBeNull();
    } finally {
      MotionGlobalConfig.skipAnimations = true;
    }
  });

  it("names the first visitor from sessions the live list already fetched", async () => {
    mocks.sessions = [
      { session_id: "s2", session_start: "2026-09-28 10:04:00", country: "FR", browser: "Safari" },
      { session_id: "s1", session_start: "2026-09-28 10:01:00", country: "DE", browser: "Firefox" },
    ];
    show(<LiveUserCountProbe />);
    await waitingHeading();

    await firstPageviewLands();

    expect(await screen.findByText("from Germany · Firefox")).toBeTruthy();
  });

  it("moves focus into the confirmation when it was inside the waiting card", async () => {
    show();
    await waitingHeading();
    screen.getByRole("tab", { name: "AI agent" }).focus();

    await firstPageviewLands();
    await arrivedHeading();

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Explore your dashboard" }))
    );
  });

  it("leaves focus alone when it wasn't in the waiting card", async () => {
    show();
    await waitingHeading();

    await firstPageviewLands();
    await arrivedHeading();

    expect(document.activeElement).toBe(document.body);
  });

  it("collapses when dismissed", async () => {
    show();
    await waitingHeading();
    await firstPageviewLands();
    await arrivedHeading();

    fireEvent.click(screen.getByRole("button", { name: "Explore your dashboard" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Now tracking acme.dev" })).toBeNull());
  });
});
