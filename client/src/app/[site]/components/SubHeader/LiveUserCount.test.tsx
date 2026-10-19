import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";

import { LiveUserCount } from "./LiveUserCount";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  sessions: [] as { session_id: string }[],
}));

vi.mock("@/api/utils", async importOriginal => ({
  ...(await importOriginal<typeof import("@/api/utils")>()),
  authedFetch: mocks.fetch,
}));
vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@uidotdev/usehooks", () => ({ useIntersectionObserver: () => [() => {}, null] }));
vi.mock("../../../../components/Sessions/SessionCard", () => ({
  SessionCard: ({ session }: { session: { session_id: string } }) => <p>{session.session_id}</p>,
  SessionCardSkeleton: () => <p>loading sessions</p>,
}));

let client: QueryClient;

const sessionCalls = () => mocks.fetch.mock.calls.filter(([path]) => path === "/sites/7/sessions").length;
const liveCountCalls = () => mocks.fetch.mock.calls.filter(([path]) => path === "/sites/7/live-user-count").length;
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const trigger = () => screen.getAllByRole("button", { hidden: true })[0];

function show(hasData: boolean) {
  client.setQueryData(["site-has-data", "7"], hasData);
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <LiveUserCount />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // vaul reads matchMedia and the scroll area a ResizeObserver; jsdom has neither.
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  mocks.fetch.mockReset();
  mocks.sessions = [{ session_id: "s1" }];
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useStore.setState({ site: "7", timezone: "UTC", filters: [] });
  mocks.fetch.mockImplementation(async (path: string) => {
    if (path === "/sites/7/live-user-count") return { data: { count: 1 } };
    if (path === "/sites/7/sessions") return { data: mocks.sessions };
    return { data: [] };
  });
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LiveUserCount", () => {
  it("polls the count but not the sessions list while the drawer is closed", async () => {
    show(true);
    await waitFor(() => expect(liveCountCalls()).toBe(1));

    await tick(30_000);

    expect(liveCountCalls()).toBeGreaterThan(1);
    expect(sessionCalls()).toBe(0);
  });

  it("polls the list only while open, and refetches it on reopening", async () => {
    show(true);
    fireEvent.click(trigger());
    expect(await screen.findByText("s1")).toBeTruthy();
    expect(sessionCalls()).toBe(1);

    await tick(10_000);
    await waitFor(() => expect(sessionCalls()).toBe(2));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(trigger().getAttribute("aria-expanded")).toBe("false"));
    await tick(30_000);
    expect(sessionCalls()).toBe(2);

    // Reopening shows the skeleton, not the list from the last opening, until the refetch lands.
    mocks.sessions = [{ session_id: "s2" }];
    fireEvent.click(trigger());
    expect(await screen.findByText("loading sessions")).toBeTruthy();
    expect(screen.queryByText("s1")).toBeNull();
    expect(await screen.findByText("s2")).toBeTruthy();
    expect(sessionCalls()).toBe(3);
  });

  it("keeps the list live with the drawer closed while the site has no data yet", async () => {
    show(false);
    await waitFor(() => expect(sessionCalls()).toBe(1));

    await tick(10_000);

    await waitFor(() => expect(sessionCalls()).toBe(2));
  });
});
