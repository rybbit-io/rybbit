import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useStore } from "@/lib/store";

import { holdLiveSessions } from "../Header/firstPageview";
import { LiveUserCount } from "./LiveUserCount";

type Session = { session_id: string };

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  intersecting: false,
  // Rows per page number; a page with fewer than 25 rows is the last.
  pages: {} as Record<number, Session[]>,
  // When set, the next page-1 request waits for this promise.
  holdFirstPage: null as Promise<void> | null,
}));

vi.mock("@/api/utils", async importOriginal => ({
  ...(await importOriginal<typeof import("@/api/utils")>()),
  authedFetch: mocks.fetch,
}));
vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@uidotdev/usehooks", () => ({
  useIntersectionObserver: () => [() => {}, mocks.intersecting ? { isIntersecting: true } : null],
}));
vi.mock("../../../../components/Sessions/SessionCard", () => ({
  SessionCard: ({ session }: { session: Session }) => <p>{session.session_id}</p>,
  SessionCardSkeleton: () => <p>loading sessions</p>,
}));

let client: QueryClient;

const sessionCalls = (page?: number) =>
  mocks.fetch.mock.calls.filter(([path, params]) => path === "/sites/7/sessions" && (!page || params.page === page))
    .length;
const liveCountCalls = () => mocks.fetch.mock.calls.filter(([path]) => path === "/sites/7/live-user-count").length;
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const trigger = () => screen.getAllByRole("button", { hidden: true })[0];
const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({ session_id: `${prefix}${index + 1}` }));

// jsdom never ends vaul's exit animation, so the content would stay mounted after closing. It has no
// AnimationEvent either, hence the hand-built event carrying the animation's name.
async function closeDrawer() {
  const dialog = screen.getByRole("dialog");
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(trigger().getAttribute("aria-expanded")).toBe("false"));
  const animationEnd = Object.assign(new Event("animationend", { bubbles: true }), {
    animationName: getComputedStyle(dialog).animationName,
  });
  act(() => void dialog.dispatchEvent(animationEnd));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

let releases: (() => void)[] = [];

// `held`: NoData's install card is up for the site, so the list stays live with the drawer closed.
function show({ held = false }: { held?: boolean } = {}) {
  if (held) releases.push(holdLiveSessions("7"));
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
  mocks.intersecting = false;
  mocks.pages = { 1: [{ session_id: "s1" }] };
  mocks.holdFirstPage = null;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useStore.setState({ site: "7", timezone: "UTC", filters: [] });
  mocks.fetch.mockImplementation(async (path: string, params: { page?: number }) => {
    if (path === "/sites/7/live-user-count") return { data: { count: 1 } };
    if (path === "/sites/7/sessions") {
      if (params.page === 1 && mocks.holdFirstPage) await mocks.holdFirstPage;
      return { data: mocks.pages[params.page ?? 1] ?? [] };
    }
    return { data: [] };
  });
});

afterEach(() => {
  cleanup();
  releases.forEach(release => release());
  releases = [];
  onlineManager.setOnline(true);
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LiveUserCount", () => {
  it("polls the count but not the sessions list while the drawer is closed", async () => {
    show();
    await waitFor(() => expect(liveCountCalls()).toBe(1));

    await tick(30_000);

    expect(liveCountCalls()).toBeGreaterThan(1);
    expect(sessionCalls()).toBe(0);
  });

  it("polls the list only while open, and refetches it on reopening", async () => {
    show();
    fireEvent.click(trigger());
    expect(await screen.findByText("s1")).toBeTruthy();
    expect(sessionCalls()).toBe(1);

    await tick(10_000);
    await waitFor(() => expect(sessionCalls()).toBe(2));

    await closeDrawer();
    await tick(30_000);
    expect(sessionCalls()).toBe(2);

    // Reopening shows the skeleton, not the list from the last opening, until the refetch lands.
    mocks.pages = { 1: [{ session_id: "s2" }] };
    fireEvent.click(trigger());
    expect(await screen.findByText("loading sessions")).toBeTruthy();
    expect(screen.queryByText("s1")).toBeNull();
    expect(await screen.findByText("s2")).toBeTruthy();
    expect(sessionCalls()).toBe(3);
  });

  it("stops a refetch from walking the remaining pages when the drawer closes", async () => {
    mocks.pages = { 1: rows("a", 25), 2: rows("b", 3) };
    mocks.intersecting = true;
    show();
    fireEvent.click(trigger());
    expect(await screen.findByText("b3")).toBeTruthy();
    expect(sessionCalls(2)).toBe(1);
    mocks.intersecting = false;

    // The next poll refetches page 1, then would go on to page 2.
    let releaseFirstPage = () => {};
    mocks.holdFirstPage = new Promise(resolve => (releaseFirstPage = resolve));
    await tick(10_000);
    await waitFor(() => expect(sessionCalls(1)).toBe(2));

    await closeDrawer();
    const pollConfig = mocks.fetch.mock.calls.filter(([path]) => path === "/sites/7/sessions").at(-1)![2];
    expect(pollConfig.signal.aborted).toBe(true);
    releaseFirstPage();
    await tick(1_000);

    expect(sessionCalls(2)).toBe(1);
  });

  it("keeps the list live with the drawer closed while the install card holds it", async () => {
    show({ held: true });
    await waitFor(() => expect(sessionCalls()).toBe(1));

    await tick(10_000);

    await waitFor(() => expect(sessionCalls()).toBe(2));
  });

  it("still refetches on reopening a list it keeps live, once per opening", async () => {
    show({ held: true });
    await waitFor(() => expect(sessionCalls()).toBe(1));

    fireEvent.click(trigger());
    expect(await screen.findByText("s1")).toBeTruthy();
    expect(sessionCalls()).toBe(2);

    // Handing back to the closed-drawer poll doesn't refetch the rows the drawer just fetched.
    await closeDrawer();
    expect(sessionCalls()).toBe(2);

    // Reopened between polls: one fresh request, and the skeleton until it lands.
    mocks.pages = { 1: [{ session_id: "s2" }] };
    fireEvent.click(trigger());
    expect(await screen.findByText("loading sessions")).toBeTruthy();
    expect(await screen.findByText("s2")).toBeTruthy();
    expect(sessionCalls()).toBe(3);
  });

  it("shows an error, not the rows from the last opening, when the reopening refetch fails", async () => {
    show();
    fireEvent.click(trigger());
    expect(await screen.findByText("s1")).toBeTruthy();
    await closeDrawer();

    mocks.fetch.mockImplementation(async (path: string) => {
      if (path === "/sites/7/sessions") throw new Error("boom");
      return { data: { count: 1 } };
    });
    fireEvent.click(trigger());
    expect(await screen.findByText("Failed to load data")).toBeTruthy();
    expect(screen.queryByText("s1")).toBeNull();

    mocks.fetch.mockImplementation(async (path: string) =>
      path === "/sites/7/sessions" ? { data: [{ session_id: "s2" }] } : { data: { count: 1 } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Try Again/ }));
    expect(await screen.findByText("s2")).toBeTruthy();
  });

  it("keeps the skeleton, not the old rows, while the reopening refetch is paused offline", async () => {
    show();
    fireEvent.click(trigger());
    expect(await screen.findByText("s1")).toBeTruthy();
    await closeDrawer();

    act(() => onlineManager.setOnline(false));
    mocks.pages = { 1: [{ session_id: "s2" }] };
    fireEvent.click(trigger());
    expect(await screen.findByText("loading sessions")).toBeTruthy();
    await tick(15_000);
    expect(screen.queryByText("s1")).toBeNull();
    expect(screen.getByText("loading sessions")).toBeTruthy();

    act(() => onlineManager.setOnline(true));
    expect(await screen.findByText("s2")).toBeTruthy();
  });
});
